/**
 * Terms of Use + Acceptable Use Policy, and the Privacy Policy, in English and Arabic.
 * Drafts pending the owner's legal review (Build Plan p1-06, p1-07). Keep section ids
 * identical across languages; the i18n test checks it.
 */
export const LEGAL_UPDATED = "2026-10-24";

export interface LegalSection {
  id: string;
  heading: string;
  body?: string[];
  list?: string[];
}
export interface LegalDoc {
  title: string;
  description: string;
  sections: LegalSection[];
}

const termsEn: LegalDoc = {
  title: "Terms of Use and Acceptable Use Policy",
  description: "The rules for using Security Exile, its events, CTF arena and labs.",
  sections: [
    {
      id: "about",
      heading: "1. About these terms",
      body: [
        "Security Exile is a cybersecurity learning community at securityexile.com and its subdomains (app., ctf., labs.). By creating an account or taking part in an event you agree to these terms. If you don't agree, don't use the platform.",
      ],
    },
    {
      id: "accounts",
      heading: "2. Your account",
      list: [
        "One account per person. Keep your sign-in secure; you're responsible for what happens under your account.",
        "You must be at least 16, or have a parent's or guardian's permission.",
        "Your handle and profile must not impersonate anyone or be offensive.",
      ],
    },
    {
      id: "acceptable-use",
      heading: "3. Acceptable use",
      body: ["Hacking skills are learned here and only used where you have permission. You must not:"],
      list: [
        "Attack, scan or test anything outside the targets we explicitly put in scope (challenges and labs). The platform's own infrastructure, other players and third parties are always out of scope.",
        "Share flags, solutions or hints for a challenge in a live event. Writeups tied to an event stay hidden until it ends; publish after.",
        "Abuse lab or challenge resources: no crypto mining, no pivoting out of a lab, no denial of service, no attacking other players' instances, no using our systems to reach the wider internet.",
        "Upload malware, exploits or phishing material except clearly labelled challenge files, or post anything illegal.",
        "Harass, threaten or dox anyone, or post hateful content.",
        "Create accounts in bulk, automate sign-ups or submissions, or work around rate limits.",
      ],
    },
    {
      id: "vulnerabilities",
      heading: "4. Found a bug in the platform?",
      body: ["Report it privately through our responsible disclosure page (/security) and give us time to fix it. Testing the platform itself beyond what's needed to confirm a bug is not allowed."],
    },
    {
      id: "content",
      heading: "5. Your content",
      body: [
        "You keep ownership of the writeups, comments and images you post. You give Security Exile a licence to host and display them on the platform and to feature them (with credit) in event recaps.",
        "Don't post other people's personal data, credentials or secrets. We may hide content that breaks these rules.",
      ],
    },
    {
      id: "enforcement",
      heading: "6. Enforcement",
      body: [
        "We may warn you, hide content, remove you from an event or leaderboard, suspend or ban your account, at our discretion, for breaking these rules. Serious cases may be reported to the authorities.",
      ],
    },
    {
      id: "law",
      heading: "7. Law",
      body: [
        "Use of Security Exile must comply with the laws of the United Arab Emirates, including Federal Decree-Law No. 34 of 2021 on Combatting Rumours and Cybercrimes, and the laws where you are.",
      ],
    },
    {
      id: "disclaimer",
      heading: "8. No guarantees",
      body: ["The platform, events and prizes are provided as they are and may change, pause or be cancelled. We are not liable for indirect losses from using the platform."],
    },
    {
      id: "changes",
      heading: "9. Changes and contact",
      body: ["We'll announce material changes on Discord and update the date above. Questions: reach us on our Discord server or through the contact on /security."],
    },
  ],
};

const termsAr: LegalDoc = {
  title: "شروط الاستخدام وسياسة الاستخدام المقبول",
  description: "قواعد استخدام Security Exile وفعالياتها وساحة CTF والمختبرات.",
  sections: [
    {
      id: "about",
      heading: "1. حول هذه الشروط",
      body: [
        "Security Exile مجتمع لتعلّم الأمن السيبراني على securityexile.com ونطاقاته الفرعية (app وctf وlabs). بإنشائك حسابًا أو مشاركتك في فعالية، فإنك توافق على هذه الشروط. إن لم توافق عليها فلا تستخدم المنصة.",
      ],
    },
    {
      id: "accounts",
      heading: "2. حسابك",
      list: [
        "حساب واحد لكل شخص. حافظ على أمان تسجيل دخولك؛ فأنت مسؤول عمّا يحدث عبر حسابك.",
        "يجب ألا يقل عمرك عن 16 عامًا، أو أن تحصل على إذن وليّ أمرك.",
        "يجب ألا ينتحل اسم المستخدم أو الملف الشخصي هوية أحد، وألا يكون مسيئًا.",
      ],
    },
    {
      id: "acceptable-use",
      heading: "3. الاستخدام المقبول",
      body: ["تتعلّم مهارات الاختراق هنا ولا تستخدمها إلا حيث تملك إذنًا. يُحظر عليك:"],
      list: [
        "مهاجمة أو فحص أو اختبار أي شيء خارج الأهداف التي نحددها صراحةً (التحديات والمختبرات). البنية التحتية للمنصة واللاعبون الآخرون والأطراف الثالثة خارج النطاق دائمًا.",
        "مشاركة الأعلام أو الحلول أو التلميحات لتحدٍّ في فعالية جارية. الحلول المرتبطة بفعالية تبقى مخفية حتى تنتهي؛ انشرها بعد ذلك.",
        "إساءة استخدام موارد المختبرات أو التحديات: لا تعدين للعملات الرقمية، ولا تنقّل من المختبر إلى غيره، ولا هجمات حجب الخدمة، ولا مهاجمة بيئات اللاعبين الآخرين، ولا استخدام أنظمتنا للوصول إلى الإنترنت الأوسع.",
        "رفع برمجيات خبيثة أو ثغرات جاهزة أو مواد تصيّد إلا ملفات التحديات الموسومة بوضوح، أو نشر أي محتوى غير قانوني.",
        "مضايقة أي شخص أو تهديده أو كشف بياناته الشخصية، أو نشر محتوى يحض على الكراهية.",
        "إنشاء حسابات بالجملة، أو أتمتة التسجيل أو الإرسال، أو التحايل على حدود الاستخدام.",
      ],
    },
    {
      id: "vulnerabilities",
      heading: "4. وجدت ثغرة في المنصة؟",
      body: ["أبلغ عنها بشكل خاص عبر صفحة الإفصاح المسؤول (⁦/security⁩) وامنحنا وقتًا لإصلاحها. لا يُسمح باختبار المنصة نفسها بما يتجاوز ما يلزم لتأكيد الثغرة."],
    },
    {
      id: "content",
      heading: "5. محتواك",
      body: [
        "تبقى مالكًا للحلول والتعليقات والصور التي تنشرها. وتمنح Security Exile ترخيصًا باستضافتها وعرضها على المنصة وإبرازها (مع نسبتها إليك) في ملخصات الفعاليات.",
        "لا تنشر بيانات شخصية لغيرك أو بيانات اعتماد أو أسرارًا. يحق لنا إخفاء المحتوى المخالف لهذه القواعد.",
      ],
    },
    {
      id: "enforcement",
      heading: "6. التطبيق",
      body: [
        "يحق لنا، وفق تقديرنا، توجيه تحذير لك أو إخفاء المحتوى أو استبعادك من فعالية أو لوحة متصدرين أو إيقاف حسابك أو حظره عند مخالفة هذه القواعد. وقد تُبلَّغ الجهات المختصة في الحالات الجسيمة.",
      ],
    },
    {
      id: "law",
      heading: "7. القانون",
      body: [
        "يجب أن يتوافق استخدامك لـ Security Exile مع قوانين دولة الإمارات العربية المتحدة، ومنها المرسوم بقانون اتحادي رقم 34 لسنة 2021 في شأن مكافحة الشائعات والجرائم الإلكترونية، ومع قوانين البلد الذي تقيم فيه.",
      ],
    },
    {
      id: "disclaimer",
      heading: "8. دون ضمانات",
      body: ["تُقدَّم المنصة والفعاليات والجوائز كما هي، وقد تتغيّر أو تتوقف أو تُلغى. لا نتحمّل مسؤولية الخسائر غير المباشرة الناتجة عن استخدام المنصة."],
    },
    {
      id: "changes",
      heading: "9. التغييرات والتواصل",
      body: ["سنعلن عن التغييرات الجوهرية على ديسكورد ونحدّث التاريخ أعلاه. للاستفسارات: تواصل معنا عبر خادم ديسكورد أو عبر جهة الاتصال في صفحة ⁦/security⁩."],
    },
  ],
};

const privacyEn: LegalDoc = {
  title: "Privacy Policy",
  description: "What Security Exile stores about you, why, for how long, and your rights.",
  sections: [
    {
      id: "who",
      heading: "1. Who we are",
      body: ["Security Exile (securityexile.com) runs this community platform and decides how your data is used. We collect as little as we can and never sell it."],
    },
    {
      id: "collect",
      heading: "2. What we store",
      list: [
        "Account: your email, name and avatar from sign-in (handled by Clerk), and which provider you used (Discord, GitHub, email).",
        "Profile: your handle, bio, skills, XP and rank.",
        "Community activity: teams and roles, event registrations and rosters, war-room notes, writeups, comments, upvotes, hearts and bookmarks.",
        "Uploads: images you add to writeups.",
        "Security data: a log of privileged actions (audit log), invite-code attempts with a one-way hash of your IP address, and short-lived rate-limit counters.",
        "Technical logs kept by our host (Cloudflare) when you load a page.",
        "When the CTF arena and labs open, we will also store competition results and lab activity (which lab you launched and when). This policy will be updated before then.",
      ],
    },
    {
      id: "why",
      heading: "3. Why we use it",
      list: [
        "To run the platform and show your content and profile to the community (to perform our agreement with you).",
        "To keep the platform secure, prevent abuse and investigate reports (our legitimate interest).",
        "To send you service messages about your account or events you joined.",
      ],
    },
    {
      id: "share",
      heading: "4. Who processes it",
      body: [
        "Clerk (sign-in and accounts) and Cloudflare (hosting, database, file storage) process data for us under their own security and privacy terms. If you sign in with Discord or GitHub, they share your basic profile with us. We don't use advertising or analytics trackers.",
        "These providers may process data outside the UAE.",
      ],
    },
    {
      id: "retention",
      heading: "5. How long we keep it",
      list: [
        "Account and profile: until you delete your account.",
        "Content you post: until you or a moderator delete it. A deleted comment leaves an empty placeholder so threads stay readable.",
        "Rate-limit counters: hours to a day.",
        "Invite attempts and audit log: up to 12 months, for abuse investigation.",
        "Database backups: up to 30 days.",
      ],
    },
    {
      id: "rights",
      heading: "6. Your rights",
      body: [
        "Under the UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021) and similar laws, you can ask to access, correct or delete your data, object to or restrict its use, or receive a copy. Ask us on Discord or through the contact on /security and we'll reply within 30 days.",
      ],
    },
    {
      id: "cookies",
      heading: "7. Cookies and local storage",
      body: ["We use only the cookies needed to keep you signed in (set by Clerk), plus your effects preference stored in your browser. No tracking cookies."],
    },
    {
      id: "children",
      heading: "8. Children",
      body: ["The platform is not meant for children under 16 without a parent's or guardian's permission."],
    },
    {
      id: "changes",
      heading: "9. Changes",
      body: ["We'll update the date above and announce material changes on Discord."],
    },
  ],
};

const privacyAr: LegalDoc = {
  title: "سياسة الخصوصية",
  description: "ما الذي يخزّنه Security Exile عنك، ولماذا، وإلى متى، وما حقوقك.",
  sections: [
    {
      id: "who",
      heading: "1. من نحن",
      body: ["يدير Security Exile (securityexile.com) منصة المجتمع هذه ويحدد كيفية استخدام بياناتك. نجمع أقل قدر ممكن من البيانات ولا نبيعها أبدًا."],
    },
    {
      id: "collect",
      heading: "2. ما الذي نخزّنه",
      list: [
        "الحساب: بريدك الإلكتروني واسمك وصورتك من تسجيل الدخول (تتولاه خدمة Clerk)، ومزوّد الدخول الذي استخدمته (ديسكورد أو GitHub أو البريد).",
        "الملف الشخصي: اسم المستخدم والنبذة والمهارات ونقاط الخبرة والرتبة.",
        "نشاطك في المجتمع: الفرق والأدوار، والتسجيل في الفعاليات وقوائم اللاعبين، وملاحظات غرف العمليات، والحلول، والتعليقات، والتصويتات، والإعجابات، والمحفوظات.",
        "الملفات المرفوعة: الصور التي تضيفها إلى الحلول.",
        "بيانات أمنية: سجل بالإجراءات ذات الصلاحيات (سجل التدقيق)، ومحاولات استخدام رموز الدعوة مع تجزئة أحادية الاتجاه لعنوان IP الخاص بك، وعدّادات قصيرة الأمد لحدود الاستخدام.",
        "سجلات تقنية يحتفظ بها مزوّد الاستضافة (Cloudflare) عند تحميلك لأي صفحة.",
        "عند افتتاح ساحة CTF والمختبرات سنخزّن أيضًا نتائج المسابقات ونشاط المختبرات (أي مختبر شغّلته ومتى). وسنحدّث هذه السياسة قبل ذلك.",
      ],
    },
    {
      id: "why",
      heading: "3. لماذا نستخدمها",
      list: [
        "لتشغيل المنصة وعرض محتواك وملفك على المجتمع (تنفيذًا لاتفاقنا معك).",
        "لحماية المنصة ومنع إساءة الاستخدام والتحقيق في البلاغات (مصلحتنا المشروعة).",
        "لإرسال رسائل خدمية تخص حسابك أو الفعاليات التي انضممت إليها.",
      ],
    },
    {
      id: "share",
      heading: "4. من يعالج بياناتك",
      body: [
        "تعالج Clerk (تسجيل الدخول والحسابات) وCloudflare (الاستضافة وقاعدة البيانات وتخزين الملفات) البيانات نيابةً عنا وفق شروط الأمان والخصوصية الخاصة بهما. إذا سجّلت الدخول عبر ديسكورد أو GitHub فإنهما يشاركان ملفك الأساسي معنا. لا نستخدم أدوات تتبّع إعلانية أو تحليلية.",
        "قد يعالج هؤلاء المزوّدون البيانات خارج دولة الإمارات.",
      ],
    },
    {
      id: "retention",
      heading: "5. مدة الاحتفاظ",
      list: [
        "الحساب والملف الشخصي: حتى تحذف حسابك.",
        "المحتوى الذي تنشره: حتى تحذفه أنت أو أحد المشرفين. يترك التعليق المحذوف مكانًا فارغًا لتبقى النقاشات مقروءة.",
        "عدّادات حدود الاستخدام: من ساعات إلى يوم.",
        "محاولات رموز الدعوة وسجل التدقيق: حتى 12 شهرًا، للتحقيق في إساءة الاستخدام.",
        "النسخ الاحتياطية لقاعدة البيانات: حتى 30 يومًا.",
      ],
    },
    {
      id: "rights",
      heading: "6. حقوقك",
      body: [
        "بموجب قانون حماية البيانات الشخصية في دولة الإمارات (المرسوم بقانون اتحادي رقم 45 لسنة 2021) والقوانين المماثلة، يحق لك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها، أو الاعتراض على استخدامها أو تقييده، أو الحصول على نسخة منها. راسلنا على ديسكورد أو عبر جهة الاتصال في صفحة ⁦/security⁩ وسنرد خلال 30 يومًا.",
      ],
    },
    {
      id: "cookies",
      heading: "7. ملفات تعريف الارتباط والتخزين المحلي",
      body: ["لا نستخدم إلا ملفات تعريف الارتباط اللازمة لإبقائك مسجّل الدخول (تضعها Clerk)، إضافةً إلى تفضيل المؤثرات البصرية المحفوظ في متصفحك. لا ملفات تتبّع."],
    },
    {
      id: "children",
      heading: "8. الأطفال",
      body: ["المنصة غير موجّهة لمن هم دون 16 عامًا دون إذن وليّ الأمر."],
    },
    {
      id: "changes",
      heading: "9. التغييرات",
      body: ["سنحدّث التاريخ أعلاه ونعلن عن التغييرات الجوهرية على ديسكورد."],
    },
  ],
};

/** Competition rules for ctf.securityexile.com events (Build Plan p2-11). Not a legal draft. */
const rulesEn: LegalDoc = {
  title: "CTF Rules",
  description: "How Security Exile CTF events work and what fair play means here.",
  sections: [
    {
      id: "format",
      heading: "1. Teams and format",
      list: [
        "Events run on ctf.securityexile.com. Play solo or in a team of up to 4.",
        "One account per person, and one team per person per event.",
        "Scoring is dynamic: a challenge is worth less the more teams solve it. Ties go to the team that reached the score first.",
        "The scoreboard freezes for the final hour of each event.",
      ],
    },
    {
      id: "flags",
      heading: "2. Flags",
      body: ["Flags look like SE{...} unless a challenge says otherwise. Submit the whole flag, including SE{ and }. Wrong submissions are rate-limited, so brute-forcing the flag box won't work."],
    },
    {
      id: "fair-play",
      heading: "3. Fair play",
      list: [
        "Don't share flags, solutions or hints with anyone outside your team while an event is running.",
        "Don't work with other teams or use more than one account.",
        "Don't interfere with other players or their challenge instances.",
        "Search engines, documentation, tools and AI assistants are allowed. Asking another person to solve a challenge for you is not.",
      ],
    },
    {
      id: "scope",
      heading: "4. What's in scope",
      body: [
        "Only the challenge targets themselves. The CTF platform, the scoreboard, this website, Discord and the hosting infrastructure are out of scope. Denial of service against anything is forbidden.",
        "Found a bug in the platform instead of a challenge? Report it privately through /security. Don't use it to gain points.",
      ],
    },
    {
      id: "broken",
      heading: "5. Broken challenges and help",
      body: ["If a challenge seems broken or a service is down, open a ticket in the Discord #ctf-support channel. Admins will confirm the fix in #announcements. Admins don't give hints beyond the ones published on the platform."],
    },
    {
      id: "writeups",
      heading: "6. Writeups",
      body: ["Publish writeups only after the event ends. Writeups you post on Security Exile and link to the event stay hidden until it's over. The best community writeups are featured, with credit."],
    },
    {
      id: "enforcement",
      heading: "7. Disqualification",
      body: ["Breaking these rules can lead to points being removed, disqualification from the event, or a ban under the Terms of Use. Admins' decisions on scoring are final."],
    },
  ],
};

const rulesAr: LegalDoc = {
  title: "قواعد مسابقات CTF",
  description: "كيف تسير فعاليات CTF في Security Exile وما معنى اللعب النظيف هنا.",
  sections: [
    {
      id: "format",
      heading: "1. الفرق والنظام",
      list: [
        "تُقام الفعاليات على ctf.securityexile.com. العب منفردًا أو ضمن فريق يصل إلى 4 أعضاء.",
        "حساب واحد لكل شخص، وفريق واحد لكل شخص في كل فعالية.",
        "النقاط متغيّرة: تقل قيمة التحدي كلما حلّه عدد أكبر من الفرق. عند التعادل يتقدّم الفريق الذي بلغ النتيجة أولًا.",
        "تُجمَّد لوحة النتائج في الساعة الأخيرة من كل فعالية.",
      ],
    },
    {
      id: "flags",
      heading: "2. الأعلام",
      body: ["تأتي الأعلام بالشكل SE{...} ما لم يذكر التحدي غير ذلك. أرسل العلم كاملًا بما فيه SE{ و}. المحاولات الخاطئة محدودة العدد، لذا لن ينجح التخمين العشوائي."],
    },
    {
      id: "fair-play",
      heading: "3. اللعب النظيف",
      list: [
        "لا تشارك الأعلام أو الحلول أو التلميحات مع أي شخص خارج فريقك أثناء الفعالية.",
        "لا تتعاون مع فرق أخرى ولا تستخدم أكثر من حساب.",
        "لا تتدخّل في عمل اللاعبين الآخرين أو بيئات تحدياتهم.",
        "يُسمح بمحركات البحث والوثائق والأدوات ومساعدات الذكاء الاصطناعي. أما أن تطلب من شخص آخر حل التحدي عنك فغير مسموح.",
      ],
    },
    {
      id: "scope",
      heading: "4. ما هو ضمن النطاق",
      body: [
        "أهداف التحديات نفسها فقط. منصة CTF ولوحة النتائج وهذا الموقع وديسكورد والبنية التحتية للاستضافة كلها خارج النطاق. ويُحظر حجب الخدمة عن أي شيء.",
        "وجدت ثغرة في المنصة نفسها لا في تحدٍّ؟ أبلغ عنها بشكل خاص عبر صفحة ⁦/security⁩، ولا تستخدمها لكسب النقاط.",
      ],
    },
    {
      id: "broken",
      heading: "5. التحديات المعطّلة والمساعدة",
      body: ["إذا بدا أن تحديًا معطّل أو أن خدمة متوقفة، افتح تذكرة في قناة ⁦#ctf-support⁩ على ديسكورد. سيؤكد المشرفون الإصلاح في قناة ⁦#announcements⁩. لا يقدّم المشرفون تلميحات غير المنشورة على المنصة."],
    },
    {
      id: "writeups",
      heading: "6. الحلول المكتوبة",
      body: ["انشر حلولك بعد انتهاء الفعالية فقط. الحلول التي تنشرها على Security Exile وتربطها بالفعالية تبقى مخفية حتى تنتهي. ونُبرز أفضل حلول المجتمع مع نسبتها لأصحابها."],
    },
    {
      id: "enforcement",
      heading: "7. الاستبعاد",
      body: ["قد تؤدي مخالفة هذه القواعد إلى حذف النقاط أو الاستبعاد من الفعالية أو الحظر وفق شروط الاستخدام. قرارات المشرفين بشأن النقاط نهائية."],
    },
  ],
};

export const LEGAL = {
  terms: { en: termsEn, ar: termsAr },
  privacy: { en: privacyEn, ar: privacyAr },
  rules: { en: rulesEn, ar: rulesAr },
} as const;
