/**
 * Plain-language permission knowledge base.
 * weight = contribution to risk when requested (before caps). Severity mirrors Android protection levels,
 * with "special" for app-ops/role permissions that grant outsized power.
 */
export type PermSeverity = 'normal' | 'dangerous' | 'special' | 'signature';
export type PermGroup =
  | 'location'
  | 'camera'
  | 'microphone'
  | 'sms'
  | 'calls'
  | 'contacts'
  | 'calendar'
  | 'storage'
  | 'media'
  | 'sensors'
  | 'accounts'
  | 'network'
  | 'system'
  | 'nearby'
  | 'notifications'
  | 'other';

export interface PermissionInfo {
  label: string;
  plain: string;
  severity: PermSeverity;
  group: PermGroup;
  weight: number;
}

const P = (label: string, plain: string, severity: PermSeverity, group: PermGroup, weight: number): PermissionInfo => ({
  label,
  plain,
  severity,
  group,
  weight,
});

export const PERMISSIONS: Record<string, PermissionInfo> = {
  // SMS & calls — the favourite targets of banking trojans and fraud apps
  READ_SMS: P('Read your text messages', 'Can read every SMS, including bank OTPs.', 'dangerous', 'sms', 9),
  RECEIVE_SMS: P('Receive text messages', 'Sees incoming SMS the moment they arrive — OTP interception.', 'dangerous', 'sms', 8),
  SEND_SMS: P('Send text messages', 'Can send SMS from your number, including to premium-rate numbers.', 'dangerous', 'sms', 9),
  RECEIVE_MMS: P('Receive MMS', 'Sees incoming multimedia messages.', 'dangerous', 'sms', 4),
  RECEIVE_WAP_PUSH: P('Receive WAP push', 'Receives carrier push messages.', 'dangerous', 'sms', 3),
  READ_CALL_LOG: P('Read your call history', 'Sees who you call, when, and for how long.', 'dangerous', 'calls', 7),
  WRITE_CALL_LOG: P('Edit your call history', 'Can add or erase entries in your call log.', 'dangerous', 'calls', 6),
  PROCESS_OUTGOING_CALLS: P('Reroute outgoing calls', 'Sees dialled numbers and can redirect calls.', 'dangerous', 'calls', 7),
  CALL_PHONE: P('Make phone calls', 'Can place calls without you dialling.', 'dangerous', 'calls', 5),
  ANSWER_PHONE_CALLS: P('Answer phone calls', 'Can pick up incoming calls programmatically.', 'dangerous', 'calls', 5),
  READ_PHONE_STATE: P('Read phone status & identity', 'Reads call state and device/network identifiers.', 'dangerous', 'calls', 3),
  READ_PHONE_NUMBERS: P('Read your phone number', 'Reads the phone numbers on your SIMs.', 'dangerous', 'calls', 4),
  USE_SIP: P('Internet calling', 'Makes and receives SIP calls.', 'dangerous', 'calls', 2),
  ADD_VOICEMAIL: P('Add voicemail', 'Adds messages to your voicemail inbox.', 'dangerous', 'calls', 2),

  // Contacts, calendar, accounts
  READ_CONTACTS: P('Read your contacts', 'Can copy your whole address book — a hallmark of predatory loan apps.', 'dangerous', 'contacts', 6),
  WRITE_CONTACTS: P('Modify your contacts', 'Can add, change or delete contacts.', 'dangerous', 'contacts', 4),
  GET_ACCOUNTS: P('Find accounts on the device', 'Lists the accounts (Google, email…) signed in on this phone.', 'dangerous', 'accounts', 3),
  READ_CALENDAR: P('Read your calendar', 'Sees your events, attendees and locations.', 'dangerous', 'calendar', 3),
  WRITE_CALENDAR: P('Modify your calendar', 'Can add or change events.', 'dangerous', 'calendar', 2),

  // Location, camera, mic, sensors
  ACCESS_FINE_LOCATION: P('Precise location', 'Knows where you are, to a few metres.', 'dangerous', 'location', 4),
  ACCESS_COARSE_LOCATION: P('Approximate location', 'Knows roughly where you are.', 'dangerous', 'location', 2),
  ACCESS_BACKGROUND_LOCATION: P('Location in the background', 'Tracks location even when the app is closed.', 'dangerous', 'location', 6),
  CAMERA: P('Use the camera', 'Can take photos and record video.', 'dangerous', 'camera', 3),
  RECORD_AUDIO: P('Record audio', 'Can listen through the microphone.', 'dangerous', 'microphone', 5),
  BODY_SENSORS: P('Body sensors', 'Reads heart-rate and similar sensors.', 'dangerous', 'sensors', 3),
  BODY_SENSORS_BACKGROUND: P('Body sensors in background', 'Reads body sensors while closed.', 'dangerous', 'sensors', 4),
  ACTIVITY_RECOGNITION: P('Physical activity', 'Detects walking, driving, cycling.', 'dangerous', 'sensors', 2),

  // Storage & media
  READ_EXTERNAL_STORAGE: P('Read shared storage', 'Reads photos, downloads and documents on shared storage.', 'dangerous', 'storage', 3),
  WRITE_EXTERNAL_STORAGE: P('Write shared storage', 'Can modify or delete files on shared storage.', 'dangerous', 'storage', 3),
  MANAGE_EXTERNAL_STORAGE: P('All-files access', 'Full access to every file on shared storage.', 'special', 'storage', 7),
  READ_MEDIA_IMAGES: P('Read photos', 'Reads the photos in your gallery.', 'dangerous', 'media', 3),
  READ_MEDIA_VIDEO: P('Read videos', 'Reads the videos in your gallery.', 'dangerous', 'media', 2),
  READ_MEDIA_AUDIO: P('Read audio files', 'Reads music and recordings.', 'dangerous', 'media', 1),
  READ_MEDIA_VISUAL_USER_SELECTED: P('Selected photos', 'Reads only the photos you pick.', 'dangerous', 'media', 0),
  ACCESS_MEDIA_LOCATION: P('Photo locations', 'Reads GPS tags stored in your photos.', 'dangerous', 'media', 3),

  // System power — the scary ones
  SYSTEM_ALERT_WINDOW: P('Draw over other apps', 'Can place windows on top of other apps — used for fake login overlays.', 'special', 'system', 7),
  BIND_ACCESSIBILITY_SERVICE: P('Accessibility service', 'Can read the screen and tap for you in any app.', 'signature', 'system', 9),
  BIND_DEVICE_ADMIN: P('Device administrator', 'Can lock or wipe the device and resist uninstall.', 'signature', 'system', 8),
  BIND_NOTIFICATION_LISTENER_SERVICE: P('Read all notifications', 'Sees every notification — including OTPs and private messages.', 'signature', 'notifications', 7),
  REQUEST_INSTALL_PACKAGES: P('Install other apps', 'Can prompt to install further APKs — how droppers deliver payloads.', 'special', 'system', 6),
  REQUEST_DELETE_PACKAGES: P('Uninstall apps', 'Can prompt to remove other apps.', 'normal', 'system', 2),
  QUERY_ALL_PACKAGES: P('See all installed apps', 'Lists every app on the phone (e.g. to find banking apps).', 'normal', 'system', 3),
  PACKAGE_USAGE_STATS: P('App usage history', 'Sees which apps you use and when.', 'special', 'system', 4),
  WRITE_SETTINGS: P('Modify system settings', 'Can change system settings.', 'special', 'system', 4),
  WRITE_SECURE_SETTINGS: P('Modify secure settings', 'System-level settings — normally only for system apps.', 'signature', 'system', 6),
  READ_LOGS: P('Read system logs', 'Reads logs that may contain other apps’ data.', 'signature', 'system', 5),
  INSTALL_PACKAGES: P('Silently install apps', 'Privileged install — only system apps get this.', 'signature', 'system', 6),
  DELETE_PACKAGES: P('Silently delete apps', 'Privileged uninstall.', 'signature', 'system', 5),
  BIND_VPN_SERVICE: P('VPN service', 'Routes all of the device’s traffic through the app.', 'signature', 'network', 5),
  BIND_INPUT_METHOD: P('Keyboard', 'Is a keyboard — sees everything you type.', 'signature', 'system', 6),
  CAPTURE_AUDIO_OUTPUT: P('Capture audio output', 'Records what the phone plays.', 'signature', 'microphone', 5),
  MANAGE_ACCOUNTS: P('Manage accounts', 'Adds or removes accounts.', 'dangerous', 'accounts', 3),
  USE_CREDENTIALS: P('Use account credentials', 'Requests auth tokens.', 'dangerous', 'accounts', 3),
  DISABLE_KEYGUARD: P('Disable screen lock', 'Can turn off the lock screen.', 'normal', 'system', 4),
  RECEIVE_BOOT_COMPLETED: P('Start at boot', 'Runs automatically when the phone starts.', 'normal', 'system', 1),
  FOREGROUND_SERVICE: P('Foreground service', 'Keeps running with a notification.', 'normal', 'system', 0),
  WAKE_LOCK: P('Keep awake', 'Prevents the phone from sleeping.', 'normal', 'system', 0),
  REQUEST_IGNORE_BATTERY_OPTIMIZATIONS: P('Ignore battery optimisation', 'Asks to run without background limits.', 'normal', 'system', 2),
  SCHEDULE_EXACT_ALARM: P('Exact alarms', 'Wakes up at exact times.', 'normal', 'system', 0),
  USE_FULL_SCREEN_INTENT: P('Full-screen alerts', 'Can show full-screen notifications.', 'normal', 'notifications', 1),
  POST_NOTIFICATIONS: P('Show notifications', 'Can send you notifications.', 'dangerous', 'notifications', 0),
  KILL_BACKGROUND_PROCESSES: P('Close other apps', 'Can stop other apps’ background processes.', 'normal', 'system', 2),
  GET_TASKS: P('See running apps', 'Legacy: see which app is in front.', 'normal', 'system', 2),
  REORDER_TASKS: P('Reorder running apps', 'Moves apps to front/back.', 'normal', 'system', 1),
  EXPAND_STATUS_BAR: P('Expand status bar', 'Opens the notification shade.', 'normal', 'system', 1),
  CHANGE_COMPONENT_ENABLED_STATE: P('Hide app components', 'Can hide its own icon.', 'signature', 'system', 4),
  MODIFY_AUDIO_SETTINGS: P('Change audio settings', 'Adjusts volume and routing.', 'normal', 'system', 0),
  VIBRATE: P('Vibrate', 'Controls the vibrator.', 'normal', 'other', 0),

  // Network & nearby
  INTERNET: P('Full network access', 'Can talk to the internet.', 'normal', 'network', 0),
  ACCESS_NETWORK_STATE: P('View network connections', 'Knows whether you are online.', 'normal', 'network', 0),
  ACCESS_WIFI_STATE: P('View Wi-Fi connections', 'Sees Wi-Fi network info.', 'normal', 'network', 0),
  CHANGE_WIFI_STATE: P('Connect to Wi-Fi', 'Can switch Wi-Fi networks.', 'normal', 'network', 1),
  CHANGE_NETWORK_STATE: P('Change connectivity', 'Can change network settings.', 'normal', 'network', 1),
  BLUETOOTH: P('Bluetooth', 'Pairs with Bluetooth devices.', 'normal', 'nearby', 0),
  BLUETOOTH_ADMIN: P('Bluetooth admin', 'Discovers and pairs devices.', 'normal', 'nearby', 1),
  BLUETOOTH_SCAN: P('Find nearby devices', 'Scans for Bluetooth devices around you.', 'dangerous', 'nearby', 2),
  BLUETOOTH_CONNECT: P('Connect to nearby devices', 'Connects to paired Bluetooth devices.', 'dangerous', 'nearby', 1),
  BLUETOOTH_ADVERTISE: P('Advertise to nearby devices', 'Broadcasts to devices nearby.', 'dangerous', 'nearby', 1),
  NEARBY_WIFI_DEVICES: P('Nearby Wi-Fi devices', 'Finds devices on Wi-Fi.', 'dangerous', 'nearby', 2),
  UWB_RANGING: P('Ultra-wideband ranging', 'Measures distance to nearby devices.', 'dangerous', 'nearby', 2),
  NFC: P('NFC', 'Uses near-field communication.', 'normal', 'nearby', 1),
  USE_BIOMETRIC: P('Use biometrics', 'Asks for fingerprint/face auth.', 'normal', 'other', 0),
  USE_FINGERPRINT: P('Use fingerprint', 'Asks for fingerprint auth.', 'normal', 'other', 0),

  // Billing, misc
  'com.android.vending.BILLING': P('In-app purchases', 'Can sell things through Google Play.', 'normal', 'other', 0),
  'com.google.android.gms.permission.AD_ID': P('Advertising ID', 'Reads the advertising identifier used to profile you for ads.', 'normal', 'other', 2),
  'com.android.launcher.permission.INSTALL_SHORTCUT': P('Install shortcuts', 'Adds shortcuts to your home screen.', 'normal', 'other', 1),
};

export function lookupPermission(name: string): PermissionInfo | undefined {
  if (PERMISSIONS[name]) return PERMISSIONS[name];
  const short = name.replace(/^android\.permission\./, '');
  return PERMISSIONS[short];
}

export function shortPermission(name: string): string {
  return name.replace(/^android\.permission\./, '');
}
