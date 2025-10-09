// Auth.gs — Login basado en hoja USUARIOS (sin hash para respetar tu hoja actual)
function login(emailOrUser, password) {
  const sh = getSheet_('USUARIOS');
  const values = sh.getDataRange().getValues();
  for (let i=1;i<values.length;i++){
    const [usuario, clave, rol] = values[i];
    if ((emailOrUser||'').toString().trim().toUpperCase() === (usuario||'').toString().trim().toUpperCase()
        && password === clave) {
      const token = Utilities.getUuid();
      const cache = CacheService.getScriptCache();
      cache.put('SESS_'+token, JSON.stringify({usuario, rol}), 8*60*60);
      return { ok:true, token, usuario, rol };
    }
  }
  return { ok:false, message:'Credenciales inválidas' };
}

function logout(token) {
  const cache = CacheService.getScriptCache();
  cache.remove('SESS_'+token);
  return { ok:true };
}
