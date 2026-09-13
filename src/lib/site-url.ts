// The site's own address, in one place.
//
// It is needed in absolute form by things that are read away from the page:
// og:url, the share image, and the back-office link inside a lead notification.
// Changing the project's URL in Lovable's publish dialog means changing it
// here — and in the two static files that can't import anything,
// public/sitemap.xml and the Sitemap line in public/robots.txt.
export const SITE_URL = "https://eddie-nakharin.lovable.app";
