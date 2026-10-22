import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.cert.X509Certificate;
import java.util.Arrays;
import java.util.HexFormat;

// Secrets arrive only over stdin, never arguments/environment/files. Output is public metadata.
class VerifyAndroidKeystore {
    static byte[] field(DataInputStream in, int limit) throws Exception {
        int length = in.readInt();
        if (length < 1 || length > limit) throw new IOException("Invalid frame");
        byte[] bytes = in.readNBytes(length);
        if (bytes.length != length) throw new EOFException();
        return bytes;
    }
    public static void main(String[] args) {
        byte[] store = null, storePassBytes = null, aliasBytes = null, keyPassBytes = null;
        char[] storePass = null, keyPass = null;
        int exit = 0;
        try {
            if (args.length != 1 || !args[0].matches("[a-f0-9]{64}")) throw new Exception();
            DataInputStream in = new DataInputStream(System.in);
            store = field(in, 1048576);
            storePassBytes = field(in, 4096);
            aliasBytes = field(in, 4096);
            keyPassBytes = field(in, 4096);
            if (in.read() != -1) throw new Exception();
            storePass = new String(storePassBytes, StandardCharsets.UTF_8).toCharArray();
            keyPass = new String(keyPassBytes, StandardCharsets.UTF_8).toCharArray();
            String alias = new String(aliasBytes, StandardCharsets.UTF_8);
            KeyStore ks = KeyStore.getInstance("JKS");
            ks.load(new ByteArrayInputStream(store), storePass);
            if (ks.size() != 1 || !ks.isKeyEntry(alias)) throw new Exception();
            X509Certificate cert = (X509Certificate) ks.getCertificate(alias);
            cert.checkValidity();
            if (cert.getSubjectX500Principal().getName().contains("CN=Android Debug")) throw new Exception();
            String fingerprint = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(cert.getEncoded()));
            if (!fingerprint.equals(args[0])) throw new Exception();
            PrivateKey key = (PrivateKey) ks.getKey(alias, keyPass);
            String algorithm = switch (key.getAlgorithm()) {
                case "RSA" -> "SHA256withRSA";
                case "EC" -> "SHA256withECDSA";
                default -> throw new Exception();
            };
            byte[] challenge = "Nilaza Android backup private-key possession test".getBytes(StandardCharsets.UTF_8);
            Signature signer = Signature.getInstance(algorithm);
            signer.initSign(key); signer.update(challenge);
            byte[] signature = signer.sign();
            Signature verifier = Signature.getInstance(algorithm);
            verifier.initVerify(cert.getPublicKey()); verifier.update(challenge);
            if (!verifier.verify(signature)) throw new Exception();
            System.out.println("{\"status\":\"KEYSTORE_SIGN_VERIFY_PASS\",\"certificateSha256\":\"" + fingerprint + "\",\"algorithm\":\"" + algorithm + "\"}");
        } catch (Throwable ignored) {
            System.out.println("{\"status\":\"KEYSTORE_VERIFICATION_FAILED\"}");
            exit = 1;
        } finally {
            for (byte[] b : new byte[][] {store, storePassBytes, aliasBytes, keyPassBytes}) if (b != null) Arrays.fill(b, (byte) 0);
            if (storePass != null) Arrays.fill(storePass, '\0');
            if (keyPass != null) Arrays.fill(keyPass, '\0');
        }
        System.exit(exit);
    }
}
