const FALLBACK_WHITELIST = [];

const loadConfig = () => {
  const props = PropertiesService.getScriptProperties();
  const whitelist = props.getProperty('SENDER_WHITELIST');
  return {
    discordWebhookURL: props.getProperty('DISCORD_WEBHOOK_URL') || '',
    pingRoleId: props.getProperty('DISCORD_PING_ROLE_ID') || '',
    whitelist: whitelist ? whitelist.split(',').map((s) => s.trim()).filter(Boolean) : FALLBACK_WHITELIST,
  };
};

