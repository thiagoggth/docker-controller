export enum E_IPCChannels {
  CONTAINERS_LIST = 'containers:list',
  CONTAINERS_START = 'containers:start',
  CONTAINERS_STOP = 'containers:stop',
  SETTINGS_AUTO_RELOAD_SET = 'settings:autoReload:set',
  SETTINGS_AUTO_RELOAD_GET = 'settings:autoReload:get',
}

export enum E_OnIPCChannels {
  CONTAINERS_UPDATED = 'containers:updated',
}
