import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import {
  generateKeyPair,
  protectPrivateKey,
  unlockPrivateKey,
  setUnlockedPrivateKey,
  clearUnlockedPrivateKey,
  encryptFileForRecipients,
  decryptFilePayload,
  unwrapFileKey,
  wrapFileKey,
} from "../utils/crypto";
import {
  getMyEncryptionKeys,
  saveMyEncryptionKeys,
  getRecipientPublicKey,
  getE2EEFiles,
  uploadE2EEFile,
  getE2EEFile,
  shareE2EEFile,
} from "../api/e2eeapi";

export default function E2EEFiles() {
  const [profile, setProfile] = useState(null);
  const [password, setPassword] = useState("");
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [recipient, setRecipient] = useState("");
  const [shareFileId, setShareFileId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const refreshFiles = async () => {
    const result = await getE2EEFiles();
    setFiles(result);
  };

  useEffect(() => {
    let active = true;
    getMyEncryptionKeys()
      .then((result) => { if (active) setProfile(result); })
      .catch((err) => { if (active) setError(err.response?.data?.detail || "Could not load your encryption setup."); });
    return () => { active = false; clearUnlockedPrivateKey(); };
  }, []);

  const runBusy = async (task) => {
    setBusy(true);
    setError("");
    setMessage("");
    try { await task(); }
    catch (err) { setError(err.response?.data?.detail || err.message || "Something went wrong."); }
    finally { setBusy(false); }
  };

  const createKeys = () => runBusy(async () => {
    const pair = await generateKeyPair();
    const protectedBundle = await protectPrivateKey(pair.privateKeyPkcs8, password);
    await saveMyEncryptionKeys(pair.publicKeyPem, protectedBundle);
    const privateKey = await unlockPrivateKey(protectedBundle, password);
    setUnlockedPrivateKey(privateKey);
    setUnlocked(true);
    setProfile({ has_keys: true, public_key_pem: pair.publicKeyPem, protected_private_key: protectedBundle });
    setPassword("");
    await refreshFiles();
    setMessage("Your encryption keys are ready. Keep your encryption password safe.");
  });

  const unlock = () => runBusy(async () => {
    const privateKey = await unlockPrivateKey(profile.protected_private_key, password);
    setUnlockedPrivateKey(privateKey);
    setUnlocked(true);
    setPassword("");
    await refreshFiles();
    setMessage("Your files are unlocked on this device.");
  });

  const upload = () => runBusy(async () => {
    if (!file) throw new Error("Choose a file first.");
    if (file.size > 25 * 1024 * 1024) throw new Error("This version supports files up to 25 MB.");
    const encrypted = await encryptFileForRecipients(file, [{
      email: "me",
      publicKeyPem: profile.public_key_pem,
    }]);
    await uploadE2EEFile(file, {
      ...encrypted,
      encryptedKey: encrypted.envelopes[0].encryptedKey,
    });
    setFile(null);
    await refreshFiles();
    setMessage("File encrypted in your browser and uploaded.");
  });

  const download = (id) => runBusy(async () => {
    const payload = await getE2EEFile(id);
    const blob = await decryptFilePayload(payload);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = payload.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage("File decrypted in your browser and downloaded.");
  });

  const share = () => runBusy(async () => {
    if (!shareFileId || !recipient.trim()) throw new Error("Choose a file and enter the recipient's email.");
    const [payload, recipientData] = await Promise.all([
      getE2EEFile(shareFileId),
      getRecipientPublicKey(recipient.trim()),
    ]);
    const myFileKey = await unwrapFileKey(payload.encrypted_key);
    const recipientEnvelope = await wrapFileKey(myFileKey, recipientData.public_key_pem);
    await shareE2EEFile(shareFileId, recipientData.email, recipientEnvelope);
    setRecipient("");
    setMessage("The file has been shared. Only that recipient can unlock it.");
    await refreshFiles();
  });

  return (
    <div style={{ paddingBottom: 40 }}>
      <Navbar />
      <main style={{ maxWidth: 850, margin: "30px auto", padding: 20 }}>
        <h1>Private File Sharing</h1>
        <p>Files are locked in your browser before upload. The server stores the locked file, not the readable file.</p>

        {!profile && <p>Loading your encryption setup...</p>}

        {profile && !profile.has_keys && (
          <section style={{ border: "1px solid #ccc", borderRadius: 8, padding: 18, marginBottom: 20 }}>
            <h2>Set up file encryption</h2>
            <p>Create a separate password. This is not your account login password.</p>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New encryption password (8+ characters)" autoComplete="new-password" />
            <button disabled={busy || password.length < 8} onClick={createKeys}>Create my encryption keys</button>
          </section>
        )}

        {profile?.has_keys && !unlocked && (
          <section style={{ border: "1px solid #ccc", borderRadius: 8, padding: 18, marginBottom: 20 }}>
            <h2>Unlock your files</h2>
            <p>Enter the separate encryption password you created earlier.</p>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Encryption password" autoComplete="current-password" />
            <button disabled={busy || !password} onClick={unlock}>Unlock</button>
          </section>
        )}

        {unlocked && (
          <>
            <section style={{ border: "1px solid #ccc", borderRadius: 8, padding: 18, marginBottom: 20 }}>
              <h2>Upload a private file</h2>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <button disabled={busy || !file} onClick={upload}>Encrypt and upload</button>
            </section>

            <section style={{ border: "1px solid #ccc", borderRadius: 8, padding: 18, marginBottom: 20 }}>
              <h2>Share a file</h2>
              <select value={shareFileId} onChange={(e) => setShareFileId(e.target.value)}>
                <option value="">Choose one of your files</option>
                {files.filter((item) => item.is_owner).map((item) => (
                  <option key={item.id} value={item.id}>{item.filename}</option>
                ))}
              </select>
              <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient's account email" type="email" />
              <button disabled={busy || !shareFileId || !recipient.trim()} onClick={share}>Share securely</button>
            </section>

            <section style={{ border: "1px solid #ccc", borderRadius: 8, padding: 18 }}>
              <h2>Your private and shared files</h2>
              <button disabled={busy} onClick={() => runBusy(refreshFiles)}>Refresh list</button>
              {files.length === 0 && <p>No encrypted files yet.</p>}
              <ul>
                {files.map((item) => (
                  <li key={item.id} style={{ margin: "12px 0" }}>
                    <strong>{item.filename}</strong> — {item.is_owner ? "Your file" : "Shared with you"}
                    <button disabled={busy} onClick={() => download(item.id)} style={{ marginLeft: 10 }}>Decrypt and download</button>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {busy && <p>Working...</p>}
        {message && <p style={{ color: "green" }}>{message}</p>}
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <p style={{ marginTop: 24, fontSize: 13 }}>
          Important: if you lose your encryption password, you may lose access to your files. Keep it safe.
        </p>
        <button onClick={() => { clearUnlockedPrivateKey(); setUnlocked(false); setPassword(""); }}>Lock files on this device</button>
      </main>
    </div>
  );
}
