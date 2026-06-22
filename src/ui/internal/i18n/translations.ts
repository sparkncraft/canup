/**
 * SDK-owned translations for the non-English Canva locales. English is omitted —
 * react-intl uses each message's `defaultMessage`.
 *
 * Coverage note: only the locale-independent status lines that carry no app-name
 * attribution are translated here today — the refresh, cancellation, and
 * logged-in lines. The app-name-attributed strings (usage, buy, subscribe,
 * manage, trial, past-due) and the credit refresh-interval suffix currently fall
 * back to English; their `{hasApp, select, …}` structure needs a proper
 * translation pass before this package ships. Until then English shows for those
 * lines in non-English locales.
 */
const translations: Record<string, Record<string, string>> = {
  ar: {
    'canup.credits.exhaustedRefresh': 'يتم تجديد الأرصدة في {resetDate}.',
    'canup.subscription.cancelScheduled': 'ينتهي الاشتراك في {cancelDate}.',
    'canup.subscription.loggedInAs': 'تم تسجيل الدخول بحساب {email}.',
  },
  de: {
    'canup.credits.exhaustedRefresh': 'Credits werden am {resetDate} erneuert.',
    'canup.subscription.cancelScheduled': 'Abonnement endet am {cancelDate}.',
    'canup.subscription.loggedInAs': 'Du bist als {email} angemeldet.',
  },
  es: {
    'canup.credits.exhaustedRefresh': 'Los créditos se renuevan el {resetDate}.',
    'canup.subscription.cancelScheduled': 'La suscripción finaliza el {cancelDate}.',
    'canup.subscription.loggedInAs': 'Has iniciado sesión como {email}.',
  },
  'es-419': {
    'canup.credits.exhaustedRefresh': 'Los créditos se renuevan el {resetDate}.',
    'canup.subscription.cancelScheduled': 'La suscripción termina el {cancelDate}.',
    'canup.subscription.loggedInAs': 'Iniciaste sesión como {email}.',
  },
  fr: {
    'canup.credits.exhaustedRefresh': 'Les crédits se renouvellent le {resetDate}.',
    'canup.subscription.cancelScheduled': "L'abonnement prend fin le {cancelDate}.",
    'canup.subscription.loggedInAs': 'Vous êtes connecté(e) en tant que {email}.',
  },
  id: {
    'canup.credits.exhaustedRefresh': 'Kredit diperbarui pada {resetDate}.',
    'canup.subscription.cancelScheduled': 'Langganan berakhir pada {cancelDate}.',
    'canup.subscription.loggedInAs': 'Anda masuk sebagai {email}.',
  },
  it: {
    'canup.credits.exhaustedRefresh': 'I crediti si rinnovano il {resetDate}.',
    'canup.subscription.cancelScheduled': "L'abbonamento termina il {cancelDate}.",
    'canup.subscription.loggedInAs': "Hai effettuato l'accesso come {email}.",
  },
  ja: {
    'canup.credits.exhaustedRefresh': 'クレジットは{resetDate}に更新されます。',
    'canup.subscription.cancelScheduled': 'サブスクリプションは{cancelDate}に終了します。',
    'canup.subscription.loggedInAs': '{email} でログイン中です。',
  },
  ko: {
    'canup.credits.exhaustedRefresh': '크레딧은 {resetDate}에 갱신됩니다.',
    'canup.subscription.cancelScheduled': '구독이 {cancelDate}에 종료됩니다.',
    'canup.subscription.loggedInAs': '{email}(으)로 로그인되어 있습니다.',
  },
  ms: {
    'canup.credits.exhaustedRefresh': 'Kredit diperbaharui pada {resetDate}.',
    'canup.subscription.cancelScheduled': 'Langganan tamat pada {cancelDate}.',
    'canup.subscription.loggedInAs': 'Anda log masuk sebagai {email}.',
  },
  nl: {
    'canup.credits.exhaustedRefresh': 'Credits worden vernieuwd op {resetDate}.',
    'canup.subscription.cancelScheduled': 'Abonnement eindigt op {cancelDate}.',
    'canup.subscription.loggedInAs': 'Je bent ingelogd als {email}.',
  },
  pl: {
    'canup.credits.exhaustedRefresh': 'Kredyty odnowią się {resetDate}.',
    'canup.subscription.cancelScheduled': 'Subskrypcja kończy się {cancelDate}.',
    'canup.subscription.loggedInAs': 'Zalogowano jako {email}.',
  },
  'pt-BR': {
    'canup.credits.exhaustedRefresh': 'Os créditos são renovados em {resetDate}.',
    'canup.subscription.cancelScheduled': 'A assinatura termina em {cancelDate}.',
    'canup.subscription.loggedInAs': 'Você está conectado(a) como {email}.',
  },
  ro: {
    'canup.credits.exhaustedRefresh': 'Creditele se reîmprospătează pe {resetDate}.',
    'canup.subscription.cancelScheduled': 'Abonamentul se încheie pe {cancelDate}.',
    'canup.subscription.loggedInAs': 'Ești conectat(ă) ca {email}.',
  },
  sv: {
    'canup.credits.exhaustedRefresh': 'Krediter förnyas den {resetDate}.',
    'canup.subscription.cancelScheduled': 'Prenumerationen avslutas {cancelDate}.',
    'canup.subscription.loggedInAs': 'Du är inloggad som {email}.',
  },
  th: {
    'canup.credits.exhaustedRefresh': 'เครดิตจะรีเซ็ตในวันที่ {resetDate}',
    'canup.subscription.cancelScheduled': 'การสมัครสมาชิกสิ้นสุดในวันที่ {cancelDate}',
    'canup.subscription.loggedInAs': 'คุณเข้าสู่ระบบด้วย {email}',
  },
  tr: {
    'canup.credits.exhaustedRefresh': 'Krediler {resetDate} tarihinde yenilenir.',
    'canup.subscription.cancelScheduled': 'Abonelik {cancelDate} tarihinde sona erer.',
    'canup.subscription.loggedInAs': '{email} olarak giriş yaptınız.',
  },
  vi: {
    'canup.credits.exhaustedRefresh': 'Tín dụng được làm mới vào {resetDate}.',
    'canup.subscription.cancelScheduled': 'Gói đăng ký kết thúc vào {cancelDate}.',
    'canup.subscription.loggedInAs': 'Bạn đã đăng nhập bằng {email}.',
  },
};

/**
 * Returns translated messages for the given locale. Returns an empty object for
 * English or unknown locales, causing react-intl to fall back to `defaultMessage`.
 */
export function getTranslations(locale: string): Record<string, string> {
  return translations[locale] ?? {};
}
