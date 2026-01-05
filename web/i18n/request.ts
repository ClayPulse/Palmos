import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  // For static export, we use a default locale
  const locale = "en";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
