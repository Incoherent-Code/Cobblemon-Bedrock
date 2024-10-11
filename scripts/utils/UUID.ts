
export function generate(): string {
  const hexDigits = '0123456789abcdef';
  let uuid = '';

  for (let i = 0; i < 32; i++) {
    const randomIndex = Math.floor(Math.random() * 16);
    uuid += hexDigits[randomIndex];
  }

  // Insert hyphens at appropriate positions to form a valid UUID
  uuid = `${uuid.substring(0, 8)}-${uuid.substring(8, 12)}-4${uuid.substring(13, 16)}-${uuid.substring(16, 20)}-${uuid.substring(20)}`;

  return uuid;
}

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validate(uuid: string): boolean {
  return uuidV4Regex.test(uuid);
}