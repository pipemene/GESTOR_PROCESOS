// Auth.gs — Login, Logout y Sesiones
function login(email, password) {
  const sh = getSheet(SHEETS.USERS);
  const values = sh.getDataRange().getValues();
  const passHash = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password));
  for (let i = 1; i < values.length; i++) {
    const [em, name, role, hash] = values[i];
    if (em === email && hash === passHash) {
      const token = Utilities.getUuid();
      const cache = CacheService.getScriptCache();
      cache.put('SESS_'+token, JSON.stringify({email, name, role}), SESSION_TTL_MINUTES*60);
      return { ok: true, token, name, role };
    }
  }
  return { ok: false, message: 'Credenciales inválidas' };
}

function logout(token) {
  const cache = CacheService.getScriptCache();
  cache.remove('SESS_'+token);
  return { ok: true };
}

function getCurrentUserFromSession_() {
  const token = getTokenFromCookie_();
  if (!token) return null;
  const cache = CacheService.getScriptCache();
  const raw = cache.get('SESS_'+token);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch(e) { return null; }
}

function getTokenFromCookie_() {
  const request = HtmlService.getRequest();
  const headers = request && request.headers || {};
  const cookie = headers['Cookie'] || headers['cookie'] || '';
  const m = cookie.match(/BHSESS=([^;]+)/);
  return m ? m[1] : null;
}

function extendSession(token) {
  const cache = CacheService.getScriptCache();
  const raw = cache.get('SESS_'+token);
  if (raw) cache.put('SESS_'+token, raw, SESSION_TTL_MINUTES*60);
  return { ok: true };
}

// Usuarios
function listUsers() {
  const sh = getSheet(SHEETS.USERS);
  const values = sh.getDataRange().getValues();
  const out = [];
  for (let i=1;i<values.length;i++){
    const [email,name,role] = values[i];
    out.push({email,name,role});
  }
  return out;
}

function setUser(email, name, role, password) {
  const sh = getSheet(SHEETS.USERS);
  const values = sh.getDataRange().getValues();
  const passHash = password ? Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password)) : null;
  for (let i=1;i<values.length;i++){
    if (values[i][0] === email) {
      values[i][1] = name;
      values[i][2] = role;
      if (passHash) values[i][3] = passHash;
      sh.getRange(1,1,values.length,values[0].length).setValues(values);
      return {ok:true, updated:true};
    }
  }
  sh.appendRow([email,name,role, passHash || '', new Date()]);
  return {ok:true, created:true};
}
