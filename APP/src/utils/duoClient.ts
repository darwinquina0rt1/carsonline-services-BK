
import { Client } from '@duosecurity/duo_universal';
import { duoConfig } from '../../configs/duo';

export function getDuoClient() {
  return new Client({
    clientId: duoConfig.clientId,
    clientSecret: duoConfig.clientSecret,
    apiHost: duoConfig.apiHost,
    redirectUrl: duoConfig.redirectUrl,
  });
}
