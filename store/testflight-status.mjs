import { createPrivateKey, sign } from 'node:crypto';

const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8 } = process.env;
if (!ASC_KEY_ID || !ASC_ISSUER_ID || !ASC_KEY_P8) {
  throw new Error('Missing App Store Connect API credentials');
}

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const header = encode({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' });
const payload = encode({ iss: ASC_ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' });
const input = `${header}.${payload}`;
const key = createPrivateKey(ASC_KEY_P8.replace(/\\n/g, '\n'));
const signature = sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
const token = `${input}.${signature}`;

async function get(path) {
  const response = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${path}: ${response.status} ${JSON.stringify(body.errors ?? body)}`);
  }
  return body.data ?? [];
}

const apps = await get('/v1/apps?filter%5BbundleId%5D=com.odlet.game&limit=2');
if (apps.length !== 1) throw new Error(`Expected one ODLET app, found ${apps.length}`);
const app = apps[0];
console.log(`App: ${app.attributes.name} (${app.attributes.bundleId}), ID ${app.id}`);

const [builds, groups] = await Promise.all([
  get(`/v1/apps/${app.id}/builds?limit=20`),
  get(`/v1/apps/${app.id}/betaGroups?limit=100`),
]);
console.log('Builds:');
for (const build of builds.sort((a, b) => b.attributes.uploadedDate.localeCompare(a.attributes.uploadedDate))) {
  const a = build.attributes;
  console.log(`  ${build.id}: ${a.version}, ${a.uploadedDate}, ${a.processingState}, expired=${a.expired}, audience=${a.buildAudienceType}`);
}
console.log('Beta groups:');
for (const group of groups) {
  const a = group.attributes;
  const groupBuilds = await get(`/v1/betaGroups/${group.id}/builds?limit=100`);
  console.log(`  ${group.id}: ${a.name}, internal=${a.isInternalGroup}, allBuilds=${a.hasAccessToAllBuilds}, publicLinkEnabled=${a.publicLinkEnabled}, builds=${groupBuilds.map((b) => b.attributes.version).join(',') || 'none'}`);
}
