/**
 * SDK signatures for analytics, advertising, attribution, crash reporting and engagement libraries.
 * Matching is on class-name prefixes found in the DEX type tables. Package names are public facts;
 * this list was written for VICZO and is intentionally conservative.
 */
export type TrackerKind = 'analytics' | 'ads' | 'attribution' | 'crash' | 'engagement' | 'profiling';

export interface TrackerSig {
  id: string;
  name: string;
  kind: TrackerKind;
  prefixes: string[];
}

const T = (id: string, name: string, kind: TrackerKind, ...prefixes: string[]): TrackerSig => ({ id, name, kind, prefixes });

export const TRACKERS: TrackerSig[] = [
  T('firebase-analytics', 'Google Firebase Analytics', 'analytics', 'com.google.firebase.analytics.', 'com.google.android.gms.measurement.'),
  T('google-analytics', 'Google Analytics', 'analytics', 'com.google.android.gms.analytics.', 'com.google.analytics.'),
  T('google-admob', 'Google AdMob', 'ads', 'com.google.android.gms.ads.', 'com.google.ads.'),
  T('google-tagmanager', 'Google Tag Manager', 'analytics', 'com.google.android.gms.tagmanager.', 'com.google.tagmanager.'),
  T('firebase-crashlytics', 'Firebase Crashlytics', 'crash', 'com.google.firebase.crashlytics.', 'com.crashlytics.'),
  T('firebase-perf', 'Firebase Performance', 'analytics', 'com.google.firebase.perf.'),
  T('facebook-analytics', 'Facebook Analytics / App Events', 'analytics', 'com.facebook.appevents.'),
  T('facebook-ads', 'Facebook Audience Network', 'ads', 'com.facebook.ads.'),
  T('facebook-login', 'Facebook Login', 'profiling', 'com.facebook.login.'),
  T('facebook-share', 'Facebook Share', 'profiling', 'com.facebook.share.'),
  T('appsflyer', 'AppsFlyer', 'attribution', 'com.appsflyer.'),
  T('adjust', 'Adjust', 'attribution', 'com.adjust.sdk.'),
  T('branch', 'Branch', 'attribution', 'io.branch.'),
  T('kochava', 'Kochava', 'attribution', 'com.kochava.'),
  T('singular', 'Singular', 'attribution', 'com.singular.sdk.'),
  T('tenjin', 'Tenjin', 'attribution', 'com.tenjin.'),
  T('mixpanel', 'Mixpanel', 'analytics', 'com.mixpanel.'),
  T('amplitude', 'Amplitude', 'analytics', 'com.amplitude.'),
  T('segment', 'Segment', 'analytics', 'com.segment.analytics.'),
  T('heap', 'Heap', 'analytics', 'com.heapanalytics.'),
  T('flurry', 'Flurry', 'analytics', 'com.flurry.'),
  T('countly', 'Countly', 'analytics', 'ly.count.android.'),
  T('yandex-metrica', 'Yandex AppMetrica', 'analytics', 'com.yandex.metrica.', 'io.appmetrica.'),
  T('umeng', 'Umeng', 'analytics', 'com.umeng.'),
  T('baidu-mobstat', 'Baidu Mobile Stat', 'analytics', 'com.baidu.mobstat.'),
  T('microsoft-appcenter', 'Microsoft App Center', 'analytics', 'com.microsoft.appcenter.'),
  T('newrelic', 'New Relic', 'analytics', 'com.newrelic.agent.'),
  T('datadog', 'Datadog RUM', 'analytics', 'com.datadog.android.'),
  T('comscore', 'comScore', 'analytics', 'com.comscore.'),
  T('nielsen', 'Nielsen', 'analytics', 'com.nielsen.'),
  T('sentry', 'Sentry', 'crash', 'io.sentry.'),
  T('bugsnag', 'Bugsnag', 'crash', 'com.bugsnag.'),
  T('instabug', 'Instabug', 'crash', 'com.instabug.'),
  T('tencent-bugly', 'Tencent Bugly', 'crash', 'com.tencent.bugly.'),
  T('onesignal', 'OneSignal', 'engagement', 'com.onesignal.'),
  T('braze', 'Braze', 'engagement', 'com.braze.', 'com.appboy.'),
  T('clevertap', 'CleverTap', 'engagement', 'com.clevertap.'),
  T('moengage', 'MoEngage', 'engagement', 'com.moengage.'),
  T('leanplum', 'Leanplum', 'engagement', 'com.leanplum.'),
  T('webengage', 'WebEngage', 'engagement', 'com.webengage.'),
  T('netcore', 'Netcore Smartech', 'engagement', 'in.netcore.smartechfcm.', 'com.netcore.'),
  T('helpshift', 'Helpshift', 'engagement', 'com.helpshift.'),
  T('intercom', 'Intercom', 'engagement', 'io.intercom.'),
  T('unity-ads', 'Unity Ads', 'ads', 'com.unity3d.ads.', 'com.unity3d.services.'),
  T('applovin', 'AppLovin', 'ads', 'com.applovin.'),
  T('ironsource', 'ironSource', 'ads', 'com.ironsource.'),
  T('vungle', 'Vungle / Liftoff', 'ads', 'com.vungle.'),
  T('chartboost', 'Chartboost', 'ads', 'com.chartboost.'),
  T('inmobi', 'InMobi', 'ads', 'com.inmobi.'),
  T('mopub', 'MoPub', 'ads', 'com.mopub.'),
  T('tapjoy', 'Tapjoy', 'ads', 'com.tapjoy.'),
  T('startapp', 'Start.io', 'ads', 'com.startapp.'),
  T('adcolony', 'AdColony', 'ads', 'com.adcolony.'),
  T('pangle', 'Pangle (ByteDance)', 'ads', 'com.bytedance.sdk.openadsdk.'),
  T('mintegral', 'Mintegral', 'ads', 'com.mbridge.msdk.', 'com.mintegral.'),
  T('huawei-ads', 'Huawei Ads', 'ads', 'com.huawei.hms.ads.'),
  T('yandex-ads', 'Yandex Ads', 'ads', 'com.yandex.mobile.ads.'),
  T('mytarget', 'myTarget', 'ads', 'com.my.target.'),
  T('smaato', 'Smaato', 'ads', 'com.smaato.'),
  T('fyber', 'Fyber / DT Exchange', 'ads', 'com.fyber.'),
  T('hyprmx', 'HyprMX', 'ads', 'com.hyprmx.'),
  T('ogury', 'Ogury', 'ads', 'io.presage.', 'com.ogury.'),
  T('criteo', 'Criteo', 'ads', 'com.criteo.'),
  T('taboola', 'Taboola', 'ads', 'com.taboola.'),
  T('outbrain', 'Outbrain', 'ads', 'com.outbrain.'),
  T('verve', 'Verve / PubNative', 'ads', 'net.pubnative.'),
];

export interface TrackerHit {
  id: string;
  name: string;
  kind: TrackerKind;
  classes: number;
}

export function detectTrackers(classNames: Iterable<string>): TrackerHit[] {
  const counts = new Map<string, number>();
  for (const cls of classNames) {
    for (const t of TRACKERS) {
      for (const p of t.prefixes) {
        if (cls.startsWith(p)) {
          counts.set(t.id, (counts.get(t.id) ?? 0) + 1);
          break;
        }
      }
    }
  }
  return TRACKERS.filter((t) => counts.has(t.id)).map((t) => ({ id: t.id, name: t.name, kind: t.kind, classes: counts.get(t.id)! }));
}
