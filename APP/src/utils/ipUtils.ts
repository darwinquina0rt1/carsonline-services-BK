/**
 * Utilidades para manejo de direcciones IP
 */

/**
 * Limpia y normaliza una dirección IP
 * @param ip - Dirección IP a limpiar
 * @returns IP limpia y normalizada
 */
export function cleanIP(ip: string): string {
  if (!ip || ip === 'unknown') {
    return 'unknown';
  }

  // Remover prefijo IPv6 para IPv4 mapeada
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7); // Remover '::ffff:'
  }

  // Remover prefijo IPv6 para IPv4 mapeada con puerto
  if (ip.startsWith('::ffff:') && ip.includes('.')) {
    const parts = ip.split(':');
    if (parts.length > 1) {
      return parts[1]; // Tomar solo la parte IPv4
    }
  }

  // Si es IPv6 pura, convertir a formato más legible
  if (ip.includes(':') && !ip.includes('.')) {
    // IPv6 pura - simplificar
    if (ip === '::1') {
      return 'localhost'; // IPv6 localhost
    }
    return `[${ip}]`; // Envolver IPv6 en brackets
  }

  return ip;
}

/**
 * Obtiene la IP real del cliente considerando proxies
 * @param req - Request object de Express
 * @returns IP limpia del cliente
 */
export function getClientIP(req: any): string {
  // Intentar obtener IP de diferentes headers (para proxies/load balancers)
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const remoteAddress = req.connection?.remoteAddress || req.socket?.remoteAddress;
  const reqIP = req.ip;

  // Prioridad: x-forwarded-for > x-real-ip > req.ip > connection.remoteAddress
  let ip = forwarded || realIP || reqIP || remoteAddress || 'unknown';

  // Si x-forwarded-for tiene múltiples IPs, tomar la primera
  if (typeof ip === 'string' && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  return cleanIP(ip);
}

/**
 * Formatea una IP para mostrar de manera más legible
 * @param ip - IP a formatear
 * @returns IP formateada
 */
export function formatIP(ip: string): string {
  const cleaned = cleanIP(ip);
  
  // Casos especiales
  if (cleaned === '127.0.0.1' || cleaned === 'localhost') {
    return 'localhost (127.0.0.1)';
  }
  
  if (cleaned === 'unknown') {
    return 'IP desconocida';
  }
  
  return cleaned;
}
