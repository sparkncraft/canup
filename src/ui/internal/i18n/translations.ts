/**
 * SDK-owned translations for all 18 non-English Canva locales.
 * English is omitted — react-intl uses `defaultMessage` for English.
 */
const translations: Record<string, Record<string, string>> = {
  ar: {
    'canup.creditCounter.loggedInAs': 'تم تسجيل الدخول بحساب {email}.',
    'canup.creditCounter.manageSubscription': 'إدارة الاشتراك',
    'canup.creditCounter.upgradeForMore': 'ترقية للحصول على المزيد من الأرصدة',
    'canup.creditCounter.exhausted': 'لم يتبقَّ لديك أرصدة كافية.',
    'canup.creditCounter.exhaustedRefresh': 'يتم تجديد الأرصدة في {resetDate}.',
    'canup.creditCounter.usage':
      'تم استخدام {used} من {quota} {used, plural, zero {رصيد} one {رصيد} two {رصيدين} few {أرصدة} many {رصيداً} other {رصيد}}.',
    'canup.creditCounter.refreshInterval':
      'يتم تجديد الأرصدة {interval, select, daily {يومياً} weekly {أسبوعياً} monthly {شهرياً} other {يومياً}}.',
  },
  de: {
    'canup.creditCounter.loggedInAs': 'Du bist als {email} angemeldet.',
    'canup.creditCounter.manageSubscription': 'Abonnement verwalten',
    'canup.creditCounter.upgradeForMore': 'Für mehr Credits upgraden',
    'canup.creditCounter.exhausted': 'Du hast nicht genügend Credits übrig.',
    'canup.creditCounter.exhaustedRefresh': 'Credits werden am {resetDate} erneuert.',
    'canup.creditCounter.usage':
      'Du hast {used} von {quota} {used, plural, one {Credit} other {Credits}} verbraucht.',
    'canup.creditCounter.refreshInterval':
      'Credits werden {interval, select, daily {täglich} weekly {wöchentlich} monthly {monatlich} other {täglich}} erneuert.',
  },
  es: {
    'canup.creditCounter.loggedInAs': 'Has iniciado sesión como {email}.',
    'canup.creditCounter.manageSubscription': 'Gestionar suscripción',
    'canup.creditCounter.upgradeForMore': 'Actualiza para obtener más créditos',
    'canup.creditCounter.exhausted': 'No te quedan suficientes créditos.',
    'canup.creditCounter.exhaustedRefresh': 'Los créditos se renuevan el {resetDate}.',
    'canup.creditCounter.usage':
      'Has usado {used} de {quota} {used, plural, one {crédito} other {créditos}}.',
    'canup.creditCounter.refreshInterval':
      'Los créditos se renuevan {interval, select, daily {diariamente} weekly {semanalmente} monthly {mensualmente} other {diariamente}}.',
  },
  'es-419': {
    'canup.creditCounter.loggedInAs': 'Iniciaste sesión como {email}.',
    'canup.creditCounter.manageSubscription': 'Administrar suscripción',
    'canup.creditCounter.upgradeForMore': 'Actualiza para obtener más créditos',
    'canup.creditCounter.exhausted': 'No te quedan suficientes créditos.',
    'canup.creditCounter.exhaustedRefresh': 'Los créditos se renuevan el {resetDate}.',
    'canup.creditCounter.usage':
      'Has usado {used} de {quota} {used, plural, one {crédito} other {créditos}}.',
    'canup.creditCounter.refreshInterval':
      'Los créditos se renuevan {interval, select, daily {diariamente} weekly {semanalmente} monthly {mensualmente} other {diariamente}}.',
  },
  fr: {
    'canup.creditCounter.loggedInAs': 'Vous êtes connecté(e) en tant que {email}.',
    'canup.creditCounter.manageSubscription': "Gérer l'abonnement",
    'canup.creditCounter.upgradeForMore': 'Passez au niveau supérieur pour plus de crédits',
    'canup.creditCounter.exhausted': "Vous n'avez plus assez de crédits.",
    'canup.creditCounter.exhaustedRefresh': 'Les crédits se renouvellent le {resetDate}.',
    'canup.creditCounter.usage':
      'Vous avez utilisé {used} sur {quota} {used, plural, one {crédit} other {crédits}}.',
    'canup.creditCounter.refreshInterval':
      'Les crédits se renouvellent {interval, select, daily {chaque jour} weekly {chaque semaine} monthly {chaque mois} other {chaque jour}}.',
  },
  id: {
    'canup.creditCounter.loggedInAs': 'Anda masuk sebagai {email}.',
    'canup.creditCounter.manageSubscription': 'Kelola langganan',
    'canup.creditCounter.upgradeForMore': 'Upgrade untuk lebih banyak kredit',
    'canup.creditCounter.exhausted': 'Kredit Anda tidak mencukupi.',
    'canup.creditCounter.exhaustedRefresh': 'Kredit diperbarui pada {resetDate}.',
    'canup.creditCounter.usage':
      '{used} dari {quota} {used, plural, other {kredit}} telah digunakan.',
    'canup.creditCounter.refreshInterval':
      'Kredit diperbarui {interval, select, daily {setiap hari} weekly {setiap minggu} monthly {setiap bulan} other {setiap hari}}.',
  },
  it: {
    'canup.creditCounter.loggedInAs': "Hai effettuato l'accesso come {email}.",
    'canup.creditCounter.manageSubscription': 'Gestisci abbonamento',
    'canup.creditCounter.upgradeForMore': "Effettua l'upgrade per ottenere più crediti",
    'canup.creditCounter.exhausted': 'Non ti restano crediti a sufficienza.',
    'canup.creditCounter.exhaustedRefresh': 'I crediti si rinnovano il {resetDate}.',
    'canup.creditCounter.usage':
      'Hai usato {used} di {quota} {used, plural, one {credito} other {crediti}}.',
    'canup.creditCounter.refreshInterval':
      'I crediti si rinnovano {interval, select, daily {ogni giorno} weekly {ogni settimana} monthly {ogni mese} other {ogni giorno}}.',
  },
  ja: {
    'canup.creditCounter.loggedInAs': '{email} でログイン中です。',
    'canup.creditCounter.manageSubscription': 'サブスクリプションを管理',
    'canup.creditCounter.upgradeForMore': 'アップグレードしてクレジットを増やす',
    'canup.creditCounter.exhausted': 'クレジットが不足しています。',
    'canup.creditCounter.exhaustedRefresh': 'クレジットは{resetDate}に更新されます。',
    'canup.creditCounter.usage': '{used} / {quota} {used, plural, other {クレジット}}を使用済み。',
    'canup.creditCounter.refreshInterval':
      'クレジットは{interval, select, daily {毎日} weekly {毎週} monthly {毎月} other {毎日}}更新されます。',
  },
  ko: {
    'canup.creditCounter.loggedInAs': '{email}(으)로 로그인되어 있습니다.',
    'canup.creditCounter.manageSubscription': '구독 관리',
    'canup.creditCounter.upgradeForMore': '업그레이드하여 더 많은 크레딧 받기',
    'canup.creditCounter.exhausted': '크레딧이 부족합니다.',
    'canup.creditCounter.exhaustedRefresh': '크레딧은 {resetDate}에 갱신됩니다.',
    'canup.creditCounter.usage': '{used} / {quota} {used, plural, other {크레딧}} 사용됨.',
    'canup.creditCounter.refreshInterval':
      '크레딧은 {interval, select, daily {매일} weekly {매주} monthly {매월} other {매일}} 갱신됩니다.',
  },
  ms: {
    'canup.creditCounter.loggedInAs': 'Anda log masuk sebagai {email}.',
    'canup.creditCounter.manageSubscription': 'Urus langganan',
    'canup.creditCounter.upgradeForMore': 'Naik taraf untuk lebih banyak kredit',
    'canup.creditCounter.exhausted': 'Anda tidak mempunyai kredit yang mencukupi.',
    'canup.creditCounter.exhaustedRefresh': 'Kredit diperbaharui pada {resetDate}.',
    'canup.creditCounter.usage':
      '{used} daripada {quota} {used, plural, other {kredit}} telah digunakan.',
    'canup.creditCounter.refreshInterval':
      'Kredit diperbaharui {interval, select, daily {setiap hari} weekly {setiap minggu} monthly {setiap bulan} other {setiap hari}}.',
  },
  nl: {
    'canup.creditCounter.loggedInAs': 'Je bent ingelogd als {email}.',
    'canup.creditCounter.manageSubscription': 'Abonnement beheren',
    'canup.creditCounter.upgradeForMore': 'Upgrade voor meer credits',
    'canup.creditCounter.exhausted': 'Je hebt niet genoeg credits over.',
    'canup.creditCounter.exhaustedRefresh': 'Credits worden vernieuwd op {resetDate}.',
    'canup.creditCounter.usage':
      'Je hebt {used} van {quota} {used, plural, one {credit} other {credits}} gebruikt.',
    'canup.creditCounter.refreshInterval':
      'Credits worden {interval, select, daily {dagelijks} weekly {wekelijks} monthly {maandelijks} other {dagelijks}} vernieuwd.',
  },
  pl: {
    'canup.creditCounter.loggedInAs': 'Zalogowano jako {email}.',
    'canup.creditCounter.manageSubscription': 'Zarządzaj subskrypcją',
    'canup.creditCounter.upgradeForMore': 'Ulepsz plan, aby uzyskać więcej kredytów',
    'canup.creditCounter.exhausted': 'Nie masz wystarczającej liczby kredytów.',
    'canup.creditCounter.exhaustedRefresh': 'Kredyty odnowią się {resetDate}.',
    'canup.creditCounter.usage':
      'Wykorzystano {used} z {quota} {used, plural, one {kredyt} few {kredyty} many {kredytów} other {kredytu}}.',
    'canup.creditCounter.refreshInterval':
      'Kredyty odnawiają się {interval, select, daily {codziennie} weekly {co tydzień} monthly {co miesiąc} other {codziennie}}.',
  },
  'pt-BR': {
    'canup.creditCounter.loggedInAs': 'Você está conectado(a) como {email}.',
    'canup.creditCounter.manageSubscription': 'Gerenciar assinatura',
    'canup.creditCounter.upgradeForMore': 'Fazer upgrade para mais créditos',
    'canup.creditCounter.exhausted': 'Você não tem créditos suficientes.',
    'canup.creditCounter.exhaustedRefresh': 'Os créditos são renovados em {resetDate}.',
    'canup.creditCounter.usage':
      'Você usou {used} de {quota} {used, plural, one {crédito} other {créditos}}.',
    'canup.creditCounter.refreshInterval':
      'Os créditos são renovados {interval, select, daily {diariamente} weekly {semanalmente} monthly {mensalmente} other {diariamente}}.',
  },
  ro: {
    'canup.creditCounter.loggedInAs': 'Ești conectat(ă) ca {email}.',
    'canup.creditCounter.manageSubscription': 'Gestionează abonamentul',
    'canup.creditCounter.upgradeForMore': 'Fă upgrade pentru mai multe credite',
    'canup.creditCounter.exhausted': 'Nu mai ai suficiente credite.',
    'canup.creditCounter.exhaustedRefresh': 'Creditele se reîmprospătează pe {resetDate}.',
    'canup.creditCounter.usage':
      'Ai folosit {used} din {quota} {used, plural, one {credit} few {credite} other {de credite}}.',
    'canup.creditCounter.refreshInterval':
      'Creditele se reîmprospătează {interval, select, daily {zilnic} weekly {săptămânal} monthly {lunar} other {zilnic}}.',
  },
  sv: {
    'canup.creditCounter.loggedInAs': 'Du är inloggad som {email}.',
    'canup.creditCounter.manageSubscription': 'Hantera prenumeration',
    'canup.creditCounter.upgradeForMore': 'Uppgradera för fler krediter',
    'canup.creditCounter.exhausted': 'Du har inte tillräckligt med krediter kvar.',
    'canup.creditCounter.exhaustedRefresh': 'Krediter förnyas den {resetDate}.',
    'canup.creditCounter.usage':
      'Du har använt {used} av {quota} {used, plural, one {kredit} other {krediter}}.',
    'canup.creditCounter.refreshInterval':
      'Krediter förnyas {interval, select, daily {dagligen} weekly {veckovis} monthly {månadsvis} other {dagligen}}.',
  },
  th: {
    'canup.creditCounter.loggedInAs': 'คุณเข้าสู่ระบบด้วย {email}',
    'canup.creditCounter.manageSubscription': 'จัดการการสมัครสมาชิก',
    'canup.creditCounter.upgradeForMore': 'อัปเกรดเพื่อรับเครดิตเพิ่ม',
    'canup.creditCounter.exhausted': 'คุณมีเครดิตไม่เพียงพอ',
    'canup.creditCounter.exhaustedRefresh': 'เครดิตจะรีเซ็ตในวันที่ {resetDate}',
    'canup.creditCounter.usage': 'ใช้ไปแล้ว {used} จาก {quota} {used, plural, other {เครดิต}}',
    'canup.creditCounter.refreshInterval':
      'เครดิตจะรีเซ็ต{interval, select, daily {ทุกวัน} weekly {ทุกสัปดาห์} monthly {ทุกเดือน} other {ทุกวัน}}',
  },
  tr: {
    'canup.creditCounter.loggedInAs': '{email} olarak giriş yaptınız.',
    'canup.creditCounter.manageSubscription': 'Aboneliği yönet',
    'canup.creditCounter.upgradeForMore': 'Daha fazla kredi için yükseltin',
    'canup.creditCounter.exhausted': 'Yeterli krediniz kalmadı.',
    'canup.creditCounter.exhaustedRefresh': 'Krediler {resetDate} tarihinde yenilenir.',
    'canup.creditCounter.usage':
      '{used} / {quota} {used, plural, one {kredi} other {kredi}} kullanıldı.',
    'canup.creditCounter.refreshInterval':
      'Krediler {interval, select, daily {günlük} weekly {haftalık} monthly {aylık} other {günlük}} olarak yenilenir.',
  },
  vi: {
    'canup.creditCounter.loggedInAs': 'Bạn đã đăng nhập bằng {email}.',
    'canup.creditCounter.manageSubscription': 'Quản lý gói đăng ký',
    'canup.creditCounter.upgradeForMore': 'Nâng cấp để có thêm tín dụng',
    'canup.creditCounter.exhausted': 'Bạn không còn đủ tín dụng.',
    'canup.creditCounter.exhaustedRefresh': 'Tín dụng được làm mới vào {resetDate}.',
    'canup.creditCounter.usage':
      'Đã sử dụng {used} trong số {quota} {used, plural, other {tín dụng}}.',
    'canup.creditCounter.refreshInterval':
      'Tín dụng được làm mới {interval, select, daily {hàng ngày} weekly {hàng tuần} monthly {hàng tháng} other {hàng ngày}}.',
  },
};

/**
 * Returns translated messages for the given locale.
 * Returns an empty object for English or unknown locales,
 * causing react-intl to fall back to `defaultMessage`.
 */
export function getTranslations(locale: string): Record<string, string> {
  return translations[locale] ?? {};
}
