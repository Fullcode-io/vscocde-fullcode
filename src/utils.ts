export class Utils {
  public static quote(str: string): string {
    if (str.includes(' ')) return `"${str.replace('"', '\\"')}"`;
    return str;
  }

  public static validateKey(key: string): string {
    const err = 'Invalid auth token... check https://fullcode.io/settings for your key';
    if (!key) return err;
    return '';
  }

  public static validateProxy(proxy: string): string {
    const err =
      'Invalid proxy. Valid formats are https://user:pass@host:port or socks5://user:pass@host:port or domain\\user:pass';
    if (!proxy) return err;
    let re = new RegExp('^((https?|socks5)://)?([^:@]+(:([^:@])+)?@)?[\\w\\.-]+(:\\d+)?$', 'i');
    if (proxy.indexOf('\\') > -1) re = new RegExp('^.*\\\\.+$', 'i');
    if (!re.test(proxy)) return err;
    return '';
  }
}