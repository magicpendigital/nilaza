# Review mobile Nilaza — kiến trúc, A2UI, UI/UX và performance

Ngày: 2026-09-30 (Asia/Bangkok). Task: `nilaza-full-review-20260930/mobile`. Owner: mobile architecture reviewer. Đây là **review mã nguồn và phép đo file tại workspace**, không phải chứng nhận đã chạy tất cả luồng trên iOS/Android. Các phát hiện cần thao tác thiết bị được đánh dấu rõ. Không đọc dữ liệu riêng tư, không dùng credentials, không sửa implementation hay publish.

## Plan & Whole-App Impact Brief

Áp dụng `skills/nilaza-plan-qc/SKILL.md`; đối chiếu `AGENTS.md`, router, PLAN_QC_PROTOCOL, BRAND_GUIDELINES, DESIGN, A2UI README, FEATURE_PRD, MVP_IMPLEMENTATION_PLAN và MOBILE_EAS_TESTING. Luồng đã xem: welcome/goals, năm tab, Oracle/persona/Council, Tarot, Journal, Profile, Astrology/mythology, notifications, owner preview.

- **Mục tiêu:** phân biệt tính năng thực, scaffold/legacy và rủi ro scale; cung cấp đường kiểm thử cho owner.
- **Entry point:** năm tab, các subflow và màn save/reopen; browser/device QA được coordinator thực hiện riêng.
- **Data write:** chỉ ghi tài liệu này. Mã đọc account-scoped local storage, chat/journal/profile và bridge backend; không đọc nội dung tài khoản thật.
- **Backend/canonical contracts:** chỉ xem call sites/type phía mobile; không sửa API, prompts, RLS, migrations hoặc Council/Astrology contracts.
- **Admin:** xem ranh giới owner/mobile legacy; review protected admin và configure thuộc báo cáo coordinator.
- **Privacy/safety:** tập trung tính trung thực của thông báo lưu/xóa, permission/consent, fallback; phát hiện bảo mật server được giao lane riêng.
- **Analytics:** xem event call sites và khả năng phân biệt fallback; không xuất telemetry người dùng.
- **Rollback:** không có rollout; xóa báo cáo nếu cần. Không thay fallback hoặc runtime config.
- **Untouched:** toàn bộ app source, seeds/config, assets, backend, admin, build/device credentials.
- **Validation:** TypeScript, full mobile Jest, asset inventory và line references. Chưa đo FPS, startup, RAM hoặc kích thước APK/AAB/IPA.
- **Acceptance:** mỗi finding có mức độ, chứng cứ và manager test path; không biến suy luận từ code thành lỗi runtime đã thấy.
- **Stop condition:** không truy cập secret/user data hoặc thực hiện production action; không sửa lỗi trong lane read-only này.

## Kết luận mobile

Nilaza đã có nền tảng mobile vượt quá một mockup tĩnh: auth boundary, account-scoped persistence, bridge backend, chat patterns dùng chung, local chart deterministic, consent, loading/error và owner preview có tồn tại trong mã. Tuy nhiên **chưa đủ bằng chứng để nghiệm thu MVP production**. Journal còn thiếu vòng đời cloud cho edit/delete, mở lại nguồn chưa liên tục, lớp UI/accessibility có sai lệch chuẩn, và chưa có ngân sách performance được kiểm chứng trên RC. Có thể tiếp tục internal beta có phạm vi rõ sau khi giải quyết các P1 và chốt khả năng đang mở cho tester.

`npm --workspace apps/mobile run check`: **PASS**. Full Jest **FAIL (221/222 pass)**; isolated rerun cùng suite cũng **FAIL do vượt timeout15giây**. Gate mobile tests chưa xanh; không thể dùng typecheck để chứng minh UI đẹp, sync thực hoặc native performance đạt.

## Design system và A2UI có thật đến đâu?

| Hạng mục | Trạng thái từ mã | Bằng chứng/giới hạn |
| --- | --- | --- |
| Nhận diện | Có source of truth Open Reflection v1, font/logo/color và accessibility/motion guidance | `docs/BRAND_GUIDELINES.md`; Brand component `src/a2ui/Brand.tsx:31` dùng asset đúng và nhãn Nilaza |
| Token nền tảng | Có colors, spacing, layout breakpoints, radius, typography, motion | `src/theme.ts:1`; chưa có token chuẩn chung cho mọi trạng thái form/error/focus/disabled hoặc ngân sách native frame/startup/RAM |
| Shared primitives | Có Primary/SecondaryButton, Chip, ChoiceTile, IconButton, calendar, headers, loading, status | `src/a2ui/index.tsx`; cần sửa accessibility/drift liệt kê dưới |
| Shared chat | Có ChatSurface, Composer, Bubble, Header, ContextNotice, QuickReplyRail | Persona/Council/Oracle sử dụng adapter; `PersonaChatRoom.tsx:4`, `OracleRoom.tsx:5`, `a2ui/chat.tsx:49` |
| Adaptive shell | Có phone/tablet và rail landscape, grid, safe-area wrapper | `responsive.ts:31`, `a2ui/layout.tsx:8`, `AdaptiveNavigation.tsx:16` |
| Feature ownership | Home, auth, astrology, Council, persona room, Oracle đã tách module | Tarot/Explore/Journal/Profile, nhiều adapters/helpers và styles vẫn ở App.tsx |
| "A2UI" | Tên của lớp component React Native nội bộ | README định nghĩa rõ. Không thấy schema-driven/server-generated A2UI renderer trong các routed sources; không nên quảng bá là đã tích hợp giao thức A2UI bên ngoài |
| Enforcement | Có README và tests, nhưng chưa đủ cưỡng chế consistency | Spec 48px vs token 44px; negative tracking; nhiều text/style không dùng đầy đủ token |

Không nên áp một layout giống nhau cho chart canvas, tarot artwork và message thread chỉ để tăng tỷ lệ reuse. Phần chung cần chuẩn hóa là actions, form controls, status, lists, accessibility và tokens; phần trải nghiệm biểu tượng vẫn nên thuộc feature.

## Phép đo footprint/kiến trúc

Các số dưới là byte file tại checkout, **không phải dung lượng tải ứng dụng, APK hoặc RAM đo thực tế**.

| Nhóm | Số file | Byte | MiB |
| --- | ---: | ---: | ---: |
| `apps/mobile/assets/runtime` | 684 | 65,392,218 | 62.36 |
| Tarot runtime | 560 | 54,443,775 | 51.92 |
| Persona runtime | 68 | 5,118,396 | 4.88 |
| Feature runtime | 24 | 4,167,807 | 3.97 |
| Brand runtime | 32 | 1,662,240 | 1.59 |

546 ảnh lá bài của bảy bộ được require/context tại `App.tsx:419–519`, tổng raw **52,845,584 byte (~50.40 MiB)**. Mỗi bộ 78 lá hiện chiếm ~5.12–9.21 MiB. Vì static dependency này, thêm bộ bài sẽ tăng tài nguyên embedded dù người dùng không mở bộ đó. Đây là nguyên nhân scale footprint rõ hơn số lượng component TSX. Không thể kết luận mọi file runtime cũ đều được đóng gói; file không reachable có thể bị loại.

Ảnh Moon Garden mẫu là 720×1243 (~3.41 MiB nếu giải mã RGBA đầy đủ), cover 960×640 (~2.34 MiB), Home 1026×684 (~2.68 MiB). Đây là phép tính kích thước decoded, **không phải RAM ứng dụng thực tế**; nền tảng có thể downsample/cache khác nhau. Dùng cùng ảnh lớn cho thumbnail cần profile trên native.

`App.tsx`: **16,458 dòng, 660,281 byte**, 120 top-level functions, 95 lần useState và khoảng 917 object style entries (đếm lexical, không phải AST metric). `a2ui/index.tsx`: 1,266 dòng; `chat.tsx`: 1,132 dòng. `App_fixed.tsx` và `App_restored.tsx` là bản sao cũ 16,156/30,843 dòng; không nằm trong include của tsconfig và không được entry import trong đường runtime đã xem. Chúng tạo rủi ro đọc nhầm/sửa nhầm, chưa có bằng chứng gây app-binary bloat.

## Findings ưu tiên

P1: ảnh hưởng vòng đời dữ liệu/niềm tin cần xử lý trước MVP có sync. P2: UX/accessibility/performance hoặc fidelity nên sửa trước RC. P3: chất lượng nhỏ và nợ kỹ thuật. "Code-confirmed" nghĩa là logic thấy trong source; tác động thực tế còn cần test theo cột cuối.

| ID | Mức | Phát hiện và tác động | Evidence hiện tại | Cách owner xác nhận/điều kiện đạt |
| --- | --- | --- | --- | --- |
| M01 | P1 | **Journal edit chỉ local.** Mood/note được đổi và toast "Đã cập nhật", nhưng không có backend update tại handler; tài khoản khác thiết bị không nhận sửa | `App.tsx:4711–4715`; save tạo mới sync riêng `4581–4612` | Tài khoản test trên A/B: sửa note/mood A, refresh B. Nội dung phải thống nhất; failed sync phải có trạng thái và retry |
| M02 | P1 | **Journal delete chỉ ẩn local.** Handler thêm hidden IDs và lọc state, không xóa remote; UI nói "Đã xoá insight". Đây chưa đáp ứng deletion cloud/privacy lifecycle | `App.tsx:4717–4723`, render `8949–8954`, parent `5515` | Xóa A rồi tải trên B và kiểm tra backend test. Owner phải biết xóa local/cloud; remote deletion cần xác nhận và retry khi lỗi |
| M03 | P2 | **Mở lại nguồn chat từ Journal đi vào Oracle**, không persona/session gốc. **Astrology source đi vào Tarot mới**, vì callback chung chỉ khôi phục snapshot tarot_reading | `App.tsx:8935–8942`, `5514`, `5517`, `4636–4638` | Lưu persona/Council/Oracle/Tarot/Astrology, nhấn Mở lại nguồn. Mở đúng phiên và snapshot; nguồn không còn phải giải thích |
| M04 | P2 | **Ngày "hôm nay" theo UTC**, không ngày địa phương; người VI/TH trước 07:00 nhận key hôm qua và reset/streak không theo nửa đêm của họ | `App.tsx:1879–1885`, Daily cache/Today Pulse dùng key này | Test 23:59→00:01 Asia/Bangkok và đổi timezone. Một ngày địa phương có một pulse/quota, semantics backend tương thích |
| M05 | P2 | **Thread persona không auto-position reply.** ChatSurface không auto-scroll; adapter không gửi ref/onLayout, khác Oracle. Câu trả lời mới có thể nằm ngoài viewport khi lịch sử dài | `a2ui/chat.tsx:67–76`; `PersonaChatRoom.tsx:85`, `169–194`; Oracle `120–122` có positioning | 30 lượt chat; gửi ở giữa/cuối thread. Hiển thị reply/new-message indicator, tránh cưỡng chế scroll khi đang đọc lịch sử |
| M06 | P2 | **Nút feedback persona chỉ icon 14px**, style không minimum target, padding hay hitSlop. Retry cũng không minimum target | `PersonaChatRoom.tsx:175–180`, `217–225`, `277–280` | Chạm chính xác trên phone và dùng TalkBack/VoiceOver. Vùng chạm tối thiểu 48px theo brand, không overlap |
| M07 | P2 | **Chuẩn touch bị lệch:** Brand yêu cầu 48px, theme minimumTouchTarget 44; Composer send44; calendar arrows34 không hitSlop | `theme.ts:55`, `a2ui/chat.tsx:1019–1025`; calendar `index.tsx:447–460`, `1073–1075` | Đo target rendered trên narrow phone/large font. Sửa token và consumer; exception phải có lý do rõ |
| M08 | P2 | **Chip selected chỉ qua màu**, không accessibilityState; screen reader không biết topic/filter/mood đang chọn | `a2ui/index.tsx:174–179`; ChoiceTile đã có selected `304` | TalkBack/VoiceOver đọc selected state, focus ổn định sau chọn, không chỉ đổi màu |
| M09 | P2 | **Calendar arrow thiếu accessible label chức năng**, day cell width13.45% có thể dưới target trên màn hẹp | `a2ui/index.tsx:447–460`, `1098–1105` | Reader nói Tháng trước/Năm sau và ngày đầy đủ; không phải icon vô nghĩa. Kiểm tra 320/360px |
| M10 | P2 | **Reduce Motion chưa phủ shared motion.** Brand/nav/Tarot có hỗ trợ; FadeInView400ms và ChatThinkingIndicator loop không đọc preference | `a2ui/index.tsx:69–78`; `a2ui/chat.tsx:454–471`; shell `App.tsx:5368` | Bật Reduce Motion trong khi dùng app. Dừng loop/reveal ngay; vẫn thấy loading bằng chữ |
| M11 | P2 | **Không thấy handler native hardware back/navigation stack** trong source mobile; navigate chỉ setScreen. Android back có nguy cơ thoát thay vì trở về stage | `App.tsx:3944–3948`; không tìm thấy BackHandler trong mobile source | Android Tarot→card meaning→back, chat detail→room, Journal detail→back. Đi lùi hợp lý, không mất draft. Chưa xác nhận native runtime |
| M12 | P2 | **Main scroll cập nhật root state mỗi frame.** setContentScrollY ở callback, throttle16, phần lớn screen không memo; rerender rộng khi scroll | `App.tsx:3005`, `5123–5127`, `5433–5436`; consumers chỉ ngưỡng `5275`, `5631` | Profile release JS/UI frame khi scroll Explore/Journal. Dùng ref/ngưỡng thay state mỗi pixel và cô lập screen state |
| M13 | P2 | **List không virtualization**: 78 card library, toàn Journal, mọi persona message. Tăng số entries/message sẽ tăng mount/layout/memory | `App.tsx:8012–8034`, `9078–9088`; `PersonaChatRoom.tsx:169`; `ChatSurface:67` | 500 Journal/300 messages bằng fixtures; scroll/load/close ổn định. Chuyển list dài sang FlatList/SectionList và giữ header/footer đúng lifecycle |
| M14 | P2 | **Static all-deck assets** làm scale tăng binary/download; premium cards vẫn embedded | `App.tsx:419–519`; số đo phía trên | Đo APK/AAB và web asset payload hiện tại; cân nhắc bundled core + optional cached downloads có integrity/offline plan |
| M15 | P2 | **Whole-array local persistence mỗi thay đổi** cho messages/oracle/journal; không pagination trong list | `App.tsx:3492–3506` | Fixtures 500 entries/1000 messages, gõ/gửi/sửa nhanh và restart. Đo serialization/write time; partition/debounce/bounded retention nếu profiling cần |
| M16 | P2 | **Tarot deck detail dài; root đã xác nhận trên web:** tên/story nằm dưới fold ở Classic/Moon390×844 và Moon360×640. Image giữ intrinsic height640px khi app chỉ override width/aspectRatio; slot333×640 chứa artwork333×222. minHeight500 chỉ là floor, không phải nguyên nhân chính | `App.tsx:7931–8034`, `14209–14265`; RN Web0.21.2 Image:106–116,331–335; [runtime audit](ui-runtime.vi.md) U01 | Dùng wrapper ratio với Image absolute-fill hoặc height tính theo width; giữ contain. First fold có tên, một câu giá trị và CTA. Phải xác nhận thêm Yoga/native, không coi web là native acceptance |
| M17 | P2 | **Không thấy crop ở hai deck detail đã chạy:** contain giữ toàn artwork trong slot có khoảng trống lớn. Crop ở thumbnail hoặc build khác chưa được loại trừ; không khái quát từ hai bộ sang tất cả ảnh | `App.tsx:7934`, `14218–14222`, `8415–8425`; [Classic first fold](screenshots/classic-intro-mobile.jpg), [Moon360×640](screenshots/moon-intro-360x640.jpg) | Đối chiếu từng art slot/build/viewport; native chưa chạy lại trong phiên audit. Sửa intrinsic height và kiểm tra cả main cover lẫn thumbnail |
| M18 | P2 | **Tarot lock affordance muộn:** premium deck detail CTA vẫn "Chọn kiểu trải bài"; lock/upgrade tới draw. Có thể tạo hành trình thất vọng | `App.tsx:8415–8423`, `7581–7599` | Free tester mở premium deck: hiểu rõ preview/lock sớm, không rút giả hoặc bị dẫn qua các bước rồi mới biết |
| M19 | P2 | **Brand horizontal width104 ở Tarot topbar** thấp hơn guideline180px compact horizontal; chữ nhỏ/mất nhận diện | `App.tsx:7651`; `BRAND_GUIDELINES.md` minimum horizontal180 | Dùng symbol ở không gian hẹp hoặc variant compliant; screen reader vẫn Nilaza |
| M20 | P3 | **Typography drift:** display tracking−0.4 dù DESIGN cấm negative spacing; nhiều body style thiếu Hanken family (VD deck subtitle/story) | `theme.ts:74`; `App.tsx:14257–14265` | VI accented, font fallback, consistency ở iOS/Android; token về0/tracking đã duyệt và body font xuyên suốt |
| M21 | P3 | **Handoff label persona:** mọi non-tarot source được nói là astrology preview, gồm Oracle handoff; sai ngữ cảnh | `PersonaChatRoom.tsx:149–151`; icon đã phân biệt Oracle ở143 | Oracle→guide phải nói tiếp nối Oracle; Tarot card/reading/Astrology có nhãn đúng |
| M22 | P3 | **Quick replies persona lặp starter prompts** sau khi đã chat, thay vì follow-up theo context; thiếu điều kiện relevance | `PersonaChatRoom.tsx:74–77`, `122` | Sau câu hỏi phức tạp, chips giúp tiến tới quyết định/phản chiếu, không đề xuất lại câu hỏi ban đầu |
| M23 | P3 | **Mixed/localization affordances:** Journal search accessibilityLabel và rightLabel tiếng Anh khi VI, "Private", "Snapshot nguồn", raw snapshot/deckId hiển thị cho end user | `App.tsx:8965–8973`, `9010`, `9016`, `9028` | VI screenreader/copy phải Việt tự nhiên; ẩn technical IDs khỏi customer flow, giữ provenance thân thiện khi hữu ích |
| M24 | P3 | **Empty search hiện hai tiêu đề/no-match cùng lúc** vì nhánh query vẫn render generic empty sau đó | `App.tsx:9066–9075` | Tìm từ không có: một thông báo và hành động rõ, không trùng |
| M25 | P3 | **Home recent entry mở danh sách Journal chung**, không đúng entry; tăng tìm kiếm lại | `HomeExperience.tsx:52–53` | Nhấn từng recent mở trực tiếp entry hoặc xác định nó trong list |
| M26 | P3 | **Share-card hiện là structured preview + Share.share text**, chưa xuất ảnh shareable. UI action có nhãn share text ở result nên cần giữ sự trung thực | `App.tsx:5033–5079`, `8326` | Android/iOS share sheet phải đúng payload và error/cancel; không hứa tải ảnh nếu chưa có renderer |
| M27 | P3 | **Owner/legacy operations dư trong mobile**, mock jobs/AdminScreen không render hiện tại nhưng imports/state/audit seed vẫn tồn tại; gây nhầm capability và bundle review | `App.tsx:48–54`, `1770`, `3529`, `9667–10035`; không tìm render AdminScreen | Tách owner-only/dead legacy theo slice có regression checks; đừng suy ra protected admin cũng mock |
| M28 | P3 | **App.tsx vẫn gánh gần toàn orchestration/UI/style**, vượt layer rule của A2UI README; sửa feature tăng blast radius/review cost | File metrics trên; Tarot7175/Journal8884/Profile9094 + styles từ106xx | Tách Tarot/Journal/Profile + hooks dần, giữ contract và behavior; feature-tests thay root mega diff |
| M29 | P2 | **Draft ghi chú có thể bị mất khi rời Journal detail:** nút back chỉ chọn entry=null; note chỉ được lưu khi nhấn Save. Không thấy dirty-check hoặc draft persistence | `App.tsx:8910`, `8947`, `8991–8999` | Viết note hư cấu rồi chuyển tab/back/restart. Giữ draft hoặc nhắc lưu/discard rõ; không tự lưu raw note lên cloud trái consent |
| M30 | P3 | **Delete insight một chạm, không undo/confirmation tại entry**. Trên UI riêng tư dễ thao tác nhầm và không có cách phục hồi local hidden ID | `App.tsx:8949–8954`, `4717–4723` | Tap delete nhầm: có undo ngắn hoặc xác nhận phù hợp, feedback local/cloud rõ |
| M31 | P1 gate | **Mobile Jest gate đỏ hai lần:** full suite221/222pass; rerun riêng test Vietnam chart/persistence vượt15000ms. Chưa xác định runtime bug hay fixture/test performance | `src/features/astrology/__tests__/AstrologyExperience.test.tsx:79`, `87`; kết quả CLI phía dưới | Profile chart và test isolated ở tải ổn định; giải quyết căn nguyên/timeout hợp lý rồi rerun gate. Không bỏ qua failure để chứng nhận RC |

Phần UI còn cần device QA: keyboard trên Android/iOS, font scale150–200%, TalkBack/VoiceOver focus khi modal open/close, landscape/small-height, safe areas, slow/offline network, long names/VI glyphs, notification permission/deep links và focus khi bottom nav tự ẩn rồi hiện. Không tự ghi chúng là lỗi đã tái hiện.

## Hạng mục chưa đầy đủ, đang làm và legacy

| Hạng mục | Mức phục vụ định hướng | Đánh giá |
| --- | --- | --- |
| Journal cross-device edit/delete/source link | **Core MVP, cao** | Chưa hoàn chỉnh phía mobile; ưu tiên trước thêm nội dung |
| Manual note mới độc lập | PRD6.7 có yêu cầu; **cao nếu journal độc lập là core** | JournalScreen chỉ sửa note trên insight; chưa có create-note flow. Brand Home không hứa independent note. Owner cần chốt phạm vi thay vì chỉ đánh dấu "Done" |
| Payments/subscriptions | Nền tảng MVP có ích, bán Premium cần gate riêng | package mobile không có RevenueCat; UI nói "Premium chưa mở bán" `App.tsx:9638`. Honest preview là đúng; không xem đây là checkout đã chạy |
| Astrology local + mythology | A3/A4 đã owner-approved, phù hợp self-reflection | Feature modules có thực; cloud/native acceptance vẫn riêng. Không loại bỏ chỉ vì PRD cũ gọi phase2 |
| Face reading | **Phase3, không thiết yếu MVP** | Nên tiếp tục deferred theo privacy/safety; placeholder không phải tính năng hoàn chỉnh |
| Voice/community/human marketplace | **Phase3/later** | Không phục vụ đóng khoảng trống MVP hiện tại; tránh phát triển thêm trước ổn định core |
| Five-language expansion | **Trung bình, sau VI/EN** | types giữ năm locale nhưng UI selector disables zh-Hans/ja/ko `i18n.ts:6–12`; không thể tuyên bố đã ship5 languages |
| Shareable rendered image | **Phase2/retention, trung bình** | text+preview hiện phù hợp internal testing; rendered image chưa tồn tại đường đang xem |
| Performance/accessibility gate | **Cao, hỗ trợ mọi feature** | Có CI web-export size cap120MiB; chưa thấy native frame/startup/RAM budget + đo RC trên thiết bị trong routed source |
| App_fixed/App_restored và old brand runtime | **Legacy, thấp** | Lưu lịch sử được nhưng nên dời khỏi app source qua review có provenance. Không xóa assets một cách máy móc trước reachable analysis |
| Mobile mock AdminScreen | **Legacy, thấp** | Có protected web admin/OwnerHub mới; dead render code nên deprecate rõ và làm sạch sau impact review |
| MVP_IMPLEMENTATION_PLAN.md | **Lỗi thời ở nhiều phần** | Last updated June; vẫn nói old onboarding3deck/10guide/local-only AI và chưa backend. Dùng handoffSep/current sources để đánh giá, cần cập nhật tài liệu |
| Stitch design status | **Historical reference** | Không phải chứng nhận implementation/native hay authority logo hiện tại; brand v1 mới có ưu tiên |

## Đề xuất tiêu chuẩn acceptance

Chuẩn hiện có rõ về định vị/màu/font/radius/contrast/touch/motion và layer ownership. Chuẩn còn thiếu là bảng component states và evidence liên thông tới implementation: variant/token, error/empty/loading/disabled/focus, accessibility, long text, phone/tablet và snapshot đúng RC.

**CI đã có kiểm tra export size**, không phải chỉ kiểm tra type/tests: `.github/workflows/mobile-quality.yml:85–90` export web và gọi `validate:mobile-export`; `scripts/validate-mobile-export.mjs:8` đặt cap120MiB và tổng byte check `23–24`. Gate này kiểm soát footprint export, chưa thay thế measurement startup/FPS/RAM hoặc download từng luồng. Lane này chưa chạy export mới nên không tự báo size gatePASS.

Chốt ngân sách performance với baseline release-device trước khi đặt con số cam kết: cold/warm start, time-to-interactive, JS/UI frame stalls, RAM sau mở/đóng deck library, bundle JS/embedded assets, API first/complete reply và failed/retry. Đo cùng thiết bị tầm thấp/giữa; không lấy Metro dev hoặc web screenshot làm native proof. Theo [React Native Performance Overview](https://reactnative.dev/docs/performance), profiling cần thực hiện trên release build. [ScrollView documentation](https://reactnative.dev/docs/scrollview) xác nhận eager render toàn children; thay list dài bằng virtualization là ưu tiên cấu trúc (nguồn chính thức, đọc2026-09-30).

Manager test matrix tối thiểu:

1. Tài khoản testA/B, dữ liệu hư cấu: save→edit→delete→reopen trên hai thiết bị, restart và offline/retry.
2. Narrow360×640, regular390×884, tablet portrait/landscape; font100/150/200%; VI/EN.
3. Mở bảy deck lần đầu: tên/mô tả/CTA above fold, artwork không crop, About/Cards có cấu trúc, premium state rõ.
4. Persona/Oracle/Council30turn: reply hiển thị, lịch sử giữ vị trí, save/report/feedback dễ chạm, retry không duplicate câu hỏi/charge.
5. Native back, keyboard, modal accessibility, Reduce Motion đổi trong phiên, permission notification.
6. RC performance với fixtures500journal/300messages; ghi build/commit/device/network và artifact checksum.

## Validation và handoff

- **TypeScript:** `npm --workspace apps/mobile run check` PASS (exit0).
- **Jest full run:** **FAIL**, 37/38 suites pass, 221/222 tests pass, 280.714 giây. Chỉ `AstrologyExperience` waitFor timeout ở test "Vietnam birth completes calculation, failed disk write is visible, retry saves and reload opens the same chart" (`__tests__/AstrologyExperience.test.tsx:87`) trong lúc machine chạy checks đồng thời.
- **Jest targeted rerun:** `npm --workspace apps/mobile test -- --runInBand src/features/astrology/__tests__/AstrologyExperience.test.tsx` **FAIL**, 2/3 tests pass, tổng66.133giây. Cùng test đầu vượt explicit15000ms (16258ms); DST overlap và AI-consent doubletap pass. Chưa thể phân biệt root cause fixture/test timing, máy tải cao hay chi phí chart implementation; không suy ra native calculation sai.
- **Asset inventory:** Get-ChildItem recurse/Length tổng; image dimensions đọc từ file public bằng System.Drawing; không tạo/chỉnh ảnh.
- **Static checks:** rg architecture/import/list/navigation/accessibility; không chạy network API bằng secret hay dùng dữ liệu thật.
- **Chưa chạy trong lane này:** Metro web export/native embedded bundle, full Chrome UI và RC/device E2E; coordinator thu thập riêng. Không tạo screenshot giả.
- **Changed:** chỉ báo cáo này. Skill PlanQC/A2UI vẫn current cho quy trình review; phát hiện consumer drift không yêu cầu sửa skill ở lane read-only.
- **Recommended next slice:** Journal lifecycle cloud+source reopening (contract/backend/UI/error/delete/privacy cùng một slice), tiếp theo accessibility controls+Tarot About/Cards, rồi list virtualization/asset delivery qua measured baseline.
