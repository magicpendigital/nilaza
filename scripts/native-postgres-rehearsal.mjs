// Local native PostgreSQL adapter. All Docker mutations use IDs returned by this
// module's own labelled, network-none, socket-only containers. No cloud access.
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const docker = 'C:/Program Files/Docker/Docker/resources/bin/docker.exe';
export const nativeImage = 'public.ecr.aws/supabase/postgres@sha256:f6cdd6bf9b556934e8a761d92d082488db206deeec9349c4e938a72d65677e80';
const label = 'nilaza.qa.rehearsal=singapore-20261005';
const dockerRun = (args, input) => {
  const result = spawnSync(docker, args, { input, maxBuffer: 64 * 1024 * 1024, timeout: 45000, windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`Docker ${args[0]} failed: ${result.error?.message ?? result.stderr.toString('utf8').slice(0,700)}`);
  return args[0] === 'logs' ? Buffer.concat([result.stdout,result.stderr]) : result.stdout;
};
const literal = value => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') { assert.ok(Number.isFinite(value)); return String(value); }
  assert.equal(typeof value, 'string');
  assert.ok(!value.includes('\0'));
  return "'" + value.replaceAll("'", "''") + "'";
};
const parameters = (sql, values) => sql.replace(/\$(\d+)\b/g, (_, n) => {
  assert.ok(Number(n) <= values.length && Number(n) > 0);
  return literal(values[Number(n)-1]);
});

export class NativePostgres {
  static created = [];
  static serverVersion = null;
  static async create({ loadDataDir, artifactDirectory = 'artifacts/singapore-migration-rehearsal-2026-10-05' } = {}) {
    if(!NativePostgres.serverVersion) {
      NativePostgres.serverVersion=JSON.parse(dockerRun(['version','--format','{{json .Server}}']).toString('utf8')).Version;
    }
    const name = `nilaza-qa-20261005-${crypto.randomBytes(5).toString('hex')}`;
    const id = dockerRun(['run','-d','--name',name,'--label',label,'--network','none',
      '--user','postgres','--read-only','--tmpfs','/tmp:rw,uid=100,gid=101,mode=1777',
      '--cap-drop','ALL','--security-opt','no-new-privileges','--memory','1g','--cpus','2',
      '--shm-size','128m','--entrypoint','/bin/sh',nativeImage,'-c',
      "initdb -D /tmp/nilaza-pg -U postgres --auth-local=trust --auth-host=reject --locale=C.UTF-8 >/tmp/initdb.log && exec postgres -D /tmp/nilaza-pg -k /tmp -c listen_addresses='' -c shared_preload_libraries='' -c wal_level=logical"
    ]).toString('utf8').trim();
    assert.match(id, /^[a-f0-9]{64}$/);
    const instance = new NativePostgres(id, name);
    instance.artifactDirectory = artifactDirectory;
    NativePostgres.created.push(instance);
    const inspection = JSON.parse(dockerRun(['inspect','--format','{{json .}}',id]).toString('utf8'));
    assert.equal(inspection.Config.Labels['nilaza.qa.rehearsal'],'singapore-20261005');
    assert.equal(inspection.HostConfig.NetworkMode,'none');
    assert.ok(!inspection.HostConfig.PortBindings || Object.keys(inspection.HostConfig.PortBindings).length === 0);
    assert.equal(inspection.HostConfig.Binds,null);
    instance.isolation = { id, name, network: 'none', publishedPorts: [], bindMounts: [], image: nativeImage, readonlyRoot: inspection.HostConfig.ReadonlyRootfs };
    let ready = false;
    for (let attempt=0; attempt<30; attempt++) {
      const r = spawnSync(docker,['exec',id,'pg_isready','-h','/tmp','-U','postgres'],{windowsHide:true,timeout:5000});
      if(r.status===0){ ready=true; break; }
      await new Promise(resolve => setTimeout(resolve,300));
    }
    if(!ready) throw new Error('Task PostgreSQL did not become ready within bounded startup');
    if(loadDataDir) {
      // pg_dump does not contain cluster roles; restore the declared synthetic
      // roles explicitly before importing the archive, preserving its ACLs.
      dockerRun(['exec',id,'psql','-X','-v','ON_ERROR_STOP=1','-h','/tmp','-U','postgres','-d','postgres','-c',
        'create role anon; create role authenticated; create role service_role bypassrls;']);
      dockerRun(['exec','-i',id,'pg_restore','-h','/tmp','-U','postgres','-d','postgres',
        '--exit-on-error','--single-transaction','--clean','--if-exists'], Buffer.from(await loadDataDir.arrayBuffer()));
    }
    instance.open();
    return instance;
  }
  constructor(id,name) { this.id=id; this.name=name; this.buffer=''; this.pending=null; this.stopped=false; }
  open() {
    this.psql = spawn(docker,['exec','-i','--user','postgres',this.id,'/bin/sh','-c',
      'exec psql -X -qAt -P pager=off -h /tmp -U postgres -d postgres 2>&1'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    this.psql.stdout.setEncoding('utf8');
    this.psql.stdout.on('data', chunk => {
      this.buffer += chunk;
      const pending = this.pending;
      if(!pending) return;
      const marker = this.buffer.indexOf(pending.marker);
      if(marker<0) return;
      const result = this.buffer.slice(0,marker); this.buffer=this.buffer.slice(marker+pending.marker.length).replace(/^\r?\n/,'');
      this.pending=null; clearTimeout(pending.timer);
      const error = /ERROR:\s+([A-Z0-9]{5}):\s*([^\r\n]+)/.exec(result);
      if(error) pending.reject(Object.assign(new Error(error[2]),{code:error[1]}));
      else pending.resolve(result);
    });
    this.psql.on('error', e => this.failPending(e));
    this.psql.on('exit', code => { if(this.pending) this.failPending(new Error(`Task psql closed with code ${code}`)); });
    this.psql.stderr.on('data', chunk => this.failPending(new Error(`Task docker exec failed: ${String(chunk).slice(0,400)}`)));
    this.psql.stdin.write('\\set VERBOSITY verbose\n\\set ON_ERROR_STOP off\n');
  }
  failPending(e) { if(this.pending) { const p=this.pending; this.pending=null; clearTimeout(p.timer); p.reject(e); } }
  async send(sql) {
    assert.ok(!this.pending,'Queries must be sequential');
    const marker=`NILAZA_QA_END_${crypto.randomBytes(12).toString('hex')}`;
    return new Promise((resolve,reject) => {
      const timer=setTimeout(()=>this.failPending(new Error('Task SQL timeout after 30 seconds')),30000);
      this.pending={marker,resolve,reject,timer};
      this.psql.stdin.write(`${sql}\n\\echo ${marker}\n`);
    });
  }
  async exec(sql) { await this.send(sql.trim().replace(/;?\s*$/,';')); }
  async query(sql, values=[]) {
    const expanded=parameters(sql,values).trim().replace(/;\s*$/,'');
    const mutation=/^(insert|update|delete)\b/i.test(expanded);
    if(!mutation && !/^(select|with)\b/i.test(expanded)){await this.exec(expanded);return {rows:[]};}
    if(mutation && !/\breturning\b/i.test(expanded)){await this.exec(expanded);return {rows:[]};}
    const wrapped=mutation
      ? `with qa_rows as (${expanded}) select coalesce(json_agg(qa_rows),'[]'::json)::text from qa_rows;`
      : `select coalesce(json_agg(qa_rows),'[]'::json)::text from (${expanded}) qa_rows;`;
    const output=await this.send(wrapped);
    // PostgreSQL json_agg may insert newlines between array entries.
    const start=output.search(/^\[/m);
    if(start<0) throw new Error('Task psql did not return a JSON row');
    return {rows:JSON.parse(output.slice(start).trim())};
  }
  async transaction(fn) {
    await this.exec('begin');
    try {const result=await fn(this);await this.exec('commit');return result;}
    catch(e){await this.exec('rollback');throw e;}
  }
  async dumpDataDir() {
    const dump=dockerRun(['exec',this.id,'pg_dump','-h','/tmp','-U','postgres','-d','postgres','--format=custom']);
    return new Blob([dump]);
  }
  async close() {
    if(this.stopped)return;
    if(this.psql && this.psql.exitCode===null) {
      const closed=new Promise(resolve=>this.psql.once('exit',resolve));
      this.psql.stdin.end('\\q\n');await closed;
    }
    // Capture logs only from own task containers. No environment/config secrets.
    const logs=dockerRun(['logs',this.id]);
    fs.writeFileSync(`${this.artifactDirectory}/${this.name}.log`,logs);
    dockerRun(['stop','--time','10',this.id]);this.stopped=true;
  }
}
