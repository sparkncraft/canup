/**
 * Generates a self-signed SSL certificate for local development on `localhost`.
 *
 * The Canva editor loads apps in a sandboxed iframe and requires HTTPS, so the
 * dev server must serve TLS. The cert is written once to `.ssl/` and reused on
 * subsequent runs.
 *
 * Browsers will not trust the cert by default — visit `https://localhost:8080`
 * once and bypass the warning, or replace the files with a cert signed by a
 * locally trusted CA (e.g. via `mkcert localhost`) for warning-free dev.
 */
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { pki } from 'node-forge';

const SSL_CERT_DIR = path.resolve(process.cwd(), '.ssl');
const CERT_FILE = path.resolve(SSL_CERT_DIR, 'certificate.pem');
const KEY_FILE = path.resolve(SSL_CERT_DIR, 'private-key.pem');

export type Certificate = {
  certFile: string;
  keyFile: string;
};

const CERT_ATTRS: { name: string; value: string }[] = [
  { name: 'commonName', value: 'localhost' },
  { name: 'countryName', value: 'AU' },
  { name: 'stateOrProvinceName', value: 'New South Wales' },
  { name: 'localityName', value: 'Sydney' },
  { name: 'organizationName', value: 'Test' },
  { name: 'organizationalUnitName', value: 'Test' },
];

const generateRsaKeys = (): Promise<{ publicKey: string; privateKey: string }> =>
  new Promise((resolve, reject) => {
    crypto.generateKeyPair(
      'rsa',
      {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      },
      (err, publicKey, privateKey) => {
        if (err) {
          reject(err);
        } else {
          resolve({ publicKey, privateKey });
        }
      },
    );
  });

const generateCertificate = (opts: { privateKey: string; publicKey: string }): string => {
  const privateKey = pki.privateKeyFromPem(opts.privateKey);
  const publicKey = pki.publicKeyFromPem(opts.publicKey);

  const cert = pki.createCertificate();
  cert.publicKey = publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  cert.setSubject(CERT_ATTRS);
  cert.setIssuer(CERT_ATTRS);
  cert.sign(privateKey);

  return pki.certificateToPem(cert);
};

const writeCertFiles = async (opts: { cert: string; privateKey: string }): Promise<void> => {
  await fs.mkdir(SSL_CERT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(CERT_FILE, opts.cert, { encoding: 'utf8' }),
    fs.writeFile(KEY_FILE, opts.privateKey, { encoding: 'utf8' }),
  ]);
};

const certFilesExist = async (): Promise<boolean> => {
  try {
    await Promise.all([
      fs.access(CERT_FILE, fs.constants.R_OK | fs.constants.W_OK),
      fs.access(KEY_FILE, fs.constants.R_OK | fs.constants.W_OK),
    ]);
    return true;
  } catch {
    return false;
  }
};

export const createOrRetrieveCertificate = async (): Promise<Certificate> => {
  if (!(await certFilesExist())) {
    const keys = await generateRsaKeys();
    const cert = generateCertificate(keys);
    await writeCertFiles({ cert, privateKey: keys.privateKey });
  }

  return { certFile: CERT_FILE, keyFile: KEY_FILE };
};
