// ============================================================
// Cloud Module - 云端数据模块
// 支持 Supabase（云端）和 localStorage（本地）双模式
// 直接使用 Supabase REST API，无需 SDK
// ============================================================
var Cloud = (function() {
  var _mode = 'local';
  var _ready = false;
  var _pendingInit = [];
  var _url = '';
  var _key = '';
  var _accessToken = '';
  var _refreshToken = '';

  // ===== 初始化 =====
  function init() {
    if (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.enabled &&
        SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
      _url = SUPABASE_CONFIG.url.replace(/\/+$/, '');
      _key = SUPABASE_CONFIG.anonKey;
      // 恢复已保存的 session
      try {
        var saved = JSON.parse(localStorage.getItem('tianji_sb_session') || '{}');
        if (saved.access_token && saved.refresh_token) {
          _accessToken = saved.access_token;
          _refreshToken = saved.refresh_token;
        }
      } catch(e) {}
      _mode = 'cloud';
      console.log('[Cloud] Supabase REST 模式已连接');
    } else {
      console.log('[Cloud] 本地模式（未配置 Supabase）');
    }
    _ready = true;
    for (var i = 0; i < _pendingInit.length; i++) _pendingInit[i]();
    _pendingInit = [];
  }

  function onReady(fn) { _ready ? fn() : _pendingInit.push(fn); }
  function isCloud() { return _mode === 'cloud'; }

  // ===== REST API 工具 =====
  function _headers(useAuth) {
    var h = {
      'apikey': _key,
      'Content-Type': 'application/json'
    };
    if (useAuth && _accessToken) {
      h['Authorization'] = 'Bearer ' + _accessToken;
    }
    return h;
  }

  function _saveSession(access_token, refresh_token) {
    _accessToken = access_token || '';
    _refreshToken = refresh_token || '';
    localStorage.setItem('tianji_sb_session', JSON.stringify({
      access_token: _accessToken,
      refresh_token: _refreshToken
    }));
  }

  function _clearSession() {
    _accessToken = '';
    _refreshToken = '';
    localStorage.removeItem('tianji_sb_session');
  }

  // Auth REST API
  function _authPost(path, body) {
    return fetch(_url + '/auth/v1' + path, {
      method: 'POST',
      headers: {
        'apikey': _key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }).then(function(r) { return r.json(); });
  }

  function _authGet(path) {
    return fetch(_url + '/auth/v1' + path, {
      method: 'GET',
      headers: {
        'apikey': _key,
        'Authorization': 'Bearer ' + _accessToken
      }
    }).then(function(r) {
      if (r.status === 401) { _clearSession(); return null; }
      return r.json();
    });
  }

  // PostgREST API
  function _restGet(table, query) {
    var url = _url + '/rest/v1/' + table + (query || '');
    return fetch(url, {
      headers: _headers(true)
    }).then(function(r) { return r.json(); });
  }

  function _restPost(table, body, upsert) {
    var h = _headers(true);
    if (upsert) h['Prefer'] = 'resolution=merge-duplicates';
    return fetch(_url + '/rest/v1/' + table, {
      method: 'POST',
      headers: h,
      body: JSON.stringify(body)
    }).then(function(r) { return r.json(); });
  }

  function _restDelete(table, query) {
    return fetch(_url + '/rest/v1/' + table + (query || ''), {
      method: 'DELETE',
      headers: _headers(true)
    }).then(function(r) { return r.json(); });
  }

  // ===== Supabase 用户 → 本地用户对象 =====
  function sbToLocal(user, profile) {
    var meta = (user && user.user_metadata) || {};
    var username = meta.username || '';
    // 如果没有 meta.username，从 email 中提取（去掉 @tianji.local）
    if (!username && user.email) {
      username = user.email.replace(/@tianji\.local$/, '');
    }
    var nick = (profile && profile.nick) || meta.nick || meta.full_name || username || '用户';
    return {
      username: username || user.email || user.id || '',
      userId: user.id || '',
      nick: nick,
      phone: user.phone || '',
      email: user.email || '',
      avatar: (profile && profile.avatar) || meta.avatar || '',
      socialType: (profile && profile.social_type) || meta.socialType || '',
      isGuest: (profile && profile.is_guest) || false,
      joined: user.created_at || new Date().toISOString(),
      history: []
    };
  }

  // ===== 确保 profile 存在，不存在则自动创建 =====
  function ensureProfile(user) {
    if (!user || !user.id) return Promise.resolve({});
    return _restGet('user_profiles', '?select=*&id=eq.' + user.id)
      .then(function(profiles) {
        if (profiles && profiles.length > 0) return profiles[0];
        // profile 不存在，自动创建
        var meta = user.user_metadata || {};
        var nick = meta.nick || meta.username || user.email || '用户';
        return _restPost('user_profiles', { id: user.id, nick: nick }, true)
          .then(function() { return { id: user.id, nick: nick, avatar: '', social_type: '', is_guest: false }; })
          .catch(function() { return { id: user.id, nick: nick, avatar: '', social_type: '', is_guest: false }; });
      })
      .catch(function() {
        var meta = user.user_metadata || {};
        var nick = meta.nick || meta.username || user.email || '用户';
        return { id: user.id, nick: nick, avatar: '', social_type: '', is_guest: false };
      });
  }

  // ===== 注册 =====
  function signUp(username, password, attrs, cb) {
    onReady(function() {
      if (isCloud()) {
        var isEmail = username.indexOf('@') > 0;
        var email = isEmail ? username : username + '@tianji.local';
        var meta = { username: username };
        if (attrs.nick) meta.nick = attrs.nick;
        _authPost('/signup', {
          email: email,
          password: password,
          data: meta
        }).then(function(res) {
          if (_isAuthError(res)) { cb(cloudErr(res)); return; }
          if (res.access_token) {
            _saveSession(res.access_token, res.refresh_token);
          }
          // 保存账号映射，方便登录时查找
          try {
            var map = JSON.parse(localStorage.getItem('tianji_email_map') || '{}');
            map[username] = email;
            localStorage.setItem('tianji_email_map', JSON.stringify(map));
          } catch(e) {}
          var user = res.user || {};
          _restPost('user_profiles', {
            id: user.id,
            nick: attrs.nick || username
          }, true).then(function() {
            cb(null, sbToLocal(user, { nick: attrs.nick || username }));
          }).catch(function() {
            cb(null, sbToLocal(user, { nick: attrs.nick || username }));
          });
        }).catch(function(e) { cb(cloudErr(e)); });
      } else {
        cb(null, localSignUp(username, password, attrs));
      }
    });
  }

  // ===== 登录 =====
  function logIn(username, password, cb) {
    onReady(function() {
      if (isCloud()) {
        var mapping = localGetEmailMapping();
        var email = mapping[username] || username;
        if (email.indexOf('@') === -1) email = email + '@tianji.local';
        _authPost('/token?grant_type=password', { email: email, password: password })
          .then(function(res) {
            if (_isAuthError(res)) { cb(cloudErr(res)); return; }
            _saveSession(res.access_token, res.refresh_token);
            // 保存映射
            try {
              var map = JSON.parse(localStorage.getItem('tianji_email_map') || '{}');
              map[username] = email;
              localStorage.setItem('tianji_email_map', JSON.stringify(map));
            } catch(e) {}
            ensureProfile(res.user).then(function(profile) {
              cb(null, sbToLocal(res.user, profile));
            });
          }).catch(function(e) { cb(cloudErr(e)); });
      } else {
        cb(null, localLogIn(username, password));
      }
    });
  }

  function logInByPhone(phone, password, cb) {
    onReady(function() {
      if (isCloud()) {
        _authPost('/token?grant_type=password', { phone: phone, password: password })
          .then(function(res) {
            if (_isAuthError(res)) { cb(cloudErr(res)); return; }
            _saveSession(res.access_token, res.refresh_token);
            ensureProfile(res.user).then(function(profile) {
              cb(null, sbToLocal(res.user, profile));
            });
          }).catch(function(e) { cb(cloudErr(e)); });
      } else {
        cb(null, localLogInByContact('phone', phone, password));
      }
    });
  }

  function logInByEmail(email, password, cb) {
    onReady(function() {
      if (isCloud()) {
        _authPost('/token?grant_type=password', { email: email, password: password })
          .then(function(res) {
            if (_isAuthError(res)) { cb(cloudErr(res)); return; }
            _saveSession(res.access_token, res.refresh_token);
            ensureProfile(res.user).then(function(profile) {
              cb(null, sbToLocal(res.user, profile));
            });
          }).catch(function(e) { cb(cloudErr(e)); });
      } else {
        cb(null, localLogInByContact('email', email, password));
      }
    });
  }

  // ===== 验证码 =====
  function requestSmsCode(contact, cb) {
    onReady(function() {
      if (isCloud()) {
        var isPhone = /^1\d{10}$/.test(contact);
        var body = isPhone ? { phone: contact } : { email: contact };
        _authPost('/otp', body)
          .then(function(res) {
            if (_isAuthError(res)) { cb(cloudErr(res)); return; }
            cb(null, null);
          }).catch(function(e) { cb(cloudErr(e)); });
      } else {
        var code = String(Math.floor(100000 + Math.random() * 900000));
        var codes = localGetCodes();
        codes[contact] = { code: code, ts: Date.now() };
        localStorage.setItem('tianji_codes', JSON.stringify(codes));
        cb(null, code);
      }
    });
  }

  function signUpOrLogInWithCode(contact, code, cb) {
    onReady(function() {
      if (isCloud()) {
        var isPhone = /^1\d{10}$/.test(contact);
        var body = isPhone ? { phone: contact, otp: code, type: 'sms' } : { email: contact, otp: code, type: 'email' };
        _authPost('/verify', body)
          .then(function(res) {
            if (_isAuthError(res)) { cb(cloudErr(res)); return; }
            _saveSession(res.access_token, res.refresh_token);
            ensureProfile(res.user).then(function(profile) {
              cb(null, sbToLocal(res.user, profile));
            });
          }).catch(function(e) { cb(cloudErr(e)); });
      } else {
        var codes = localGetCodes();
        if (!codes[contact] || codes[contact].code !== code) { cb('验证码错误'); return; }
        if (Date.now() - codes[contact].ts > 300000) { cb('验证码已过期'); return; }
        var users = localGetUsers();
        var found = localFindByContact('phone', contact, users) || localFindByContact('email', contact, users);
        if (found) {
          localStorage.setItem('tianji_session', JSON.stringify({ username: found.username, ts: Date.now() }));
          cb(null, found);
        } else {
          var isPhone2 = /^1\d{10}$/.test(contact);
          var uname = isPhone2 ? ('u' + contact.substr(-4)) : ('e' + contact.split('@')[0] + '_' + Math.floor(Math.random() * 1000));
          var nick = isPhone2 ? (contact.substr(0,3) + '****' + contact.substr(7)) : contact.split('@')[0];
          users[uname] = { username: uname, nick: nick, password: '', phone: isPhone2 ? contact : '', email: isPhone2 ? '' : contact, joined: new Date().toISOString(), history: [] };
          localStorage.setItem('tianji_users', JSON.stringify(users));
          localStorage.setItem('tianji_session', JSON.stringify({ username: uname, ts: Date.now() }));
          cb(null, users[uname]);
        }
      }
    });
  }

  // ===== 社交登录 =====
  function socialLogin(platform, cb) {
    onReady(function() {
      if (isCloud()) {
        var providerMap = { wechat: 'wechat', qq: 'qq', apple: 'apple' };
        var provider = providerMap[platform];
        if (!provider) { cb('不支持的平台'); return; }
        sessionStorage.setItem('tianji_oauth_pending', '1');
        var redirectUrl = window.location.origin + window.location.pathname;
        var oauthUrl = _url + '/auth/v1/authorize?provider=' + provider +
          '&redirect_to=' + encodeURIComponent(redirectUrl);
        window.location.href = oauthUrl;
        return;
      } else {
        localSocialLogin(platform, cb);
      }
    });
  }

  // 处理 OAuth 回调（从 URL hash 中提取 token）
  function handleOAuthCallback(cb) {
    if (!isCloud()) { if (cb) cb(null, false); return; }
    var hash = window.location.hash;
    if (hash.indexOf('access_token=') === -1) { if (cb) cb(null, false); return; }
    var params = {};
    hash.substr(1).split('&').forEach(function(p) {
      var kv = p.split('=');
      params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    if (params.access_token) {
      _saveSession(params.access_token, params.refresh_token);
      window.location.hash = '';
      sessionStorage.removeItem('tianji_oauth_pending');
      _authGet('/user').then(function(user) {
        if (!user || user.error) { if (cb) cb('获取用户信息失败', false); return; }
        ensureProfile(user).then(function(profile) {
          if (cb) cb(null, sbToLocal(user, profile));
        });
      }).catch(function() { if (cb) cb('登录失败', false); });
    } else {
      if (cb) cb(null, false);
    }
  }

  // ===== 游客登录 =====
  function guestLogin(cb) {
    onReady(function() {
      if (isCloud()) {
        var fakeEmail = 'guest_' + Math.random().toString(36).substr(2, 8) + '@tianji.guest';
        var fakePass = 'guest_' + Date.now();
        _authPost('/signup', {
          email: fakeEmail,
          password: fakePass,
          data: { isGuest: true, nick: '游客' }
        }).then(function(res) {
          if (_isAuthError(res)) { cb(cloudErr(res)); return; }
          if (res.access_token) {
            _saveSession(res.access_token, res.refresh_token);
          }
          var user = res.user || {};
          _restPost('user_profiles', {
            id: user.id,
            nick: '游客',
            is_guest: true
          }, true).then(function() {
            cb(null, sbToLocal(user, { nick: '游客', is_guest: true }));
          }).catch(function() {
            cb(null, sbToLocal(user, { nick: '游客', is_guest: true }));
          });
        }).catch(function(e) { cb(cloudErr(e)); });
      } else {
        var guestId = 'guest_' + Math.random().toString(36).substr(2, 8);
        var users = localGetUsers();
        users[guestId] = { username: guestId, nick: '游客', password: '', isGuest: true, joined: new Date().toISOString(), history: [] };
        localStorage.setItem('tianji_users', JSON.stringify(users));
        localStorage.setItem('tianji_session', JSON.stringify({ username: guestId, ts: Date.now() }));
        cb(null, users[guestId]);
      }
    });
  }

  // ===== 忘记密码 =====
  function resetPassword(email, cb) {
    onReady(function() {
      if (isCloud()) {
        _authPost('/recover', { email: email })
          .then(function(res) {
            if (_isAuthError(res)) { cb(cloudErr(res)); return; }
            cb(null);
          }).catch(function(e) { cb(cloudErr(e)); });
      } else {
        cb('本地模式不支持密码重置，请直接注册新账号');
      }
    });
  }

  // ===== 退出 =====
  function logOut(cb) {
    onReady(function() {
      if (isCloud()) {
        fetch(_url + '/auth/v1/logout', {
          method: 'POST',
          headers: {
            'apikey': _key,
            'Authorization': 'Bearer ' + _accessToken
          }
        }).catch(function() {});
        _clearSession();
        localStorage.removeItem('tianji_session');
        if (cb) cb(null);
      } else {
        localStorage.removeItem('tianji_session');
        if (cb) cb(null);
      }
    });
  }

  // ===== 获取当前用户 =====
  function getCurrentUser(cb) {
    onReady(function() {
      if (isCloud()) {
        if (!_accessToken) { cb(null, null); return; }
        _authGet('/user').then(function(user) {
          if (!user || user.error) { cb(null, null); return; }
          ensureProfile(user).then(function(profile) {
            cb(null, sbToLocal(user, profile));
          });
        }).catch(function() { cb(null, null); });
      } else {
        var s = localGetSession();
        if (s && s.username) {
          var users = localGetUsers();
          cb(null, users[s.username] || null);
        } else {
          cb(null, null);
        }
      }
    });
  }

  // ===== 数据同步 =====
  function saveHistory(type, detail, cb) {
    onReady(function() {
      if (isCloud()) {
        if (!_accessToken) { if (cb) cb(null); return; }
        _restPost('user_history', {
          user_id: _parseJwt(_accessToken).sub,
          type: type,
          detail: detail
        }).then(function() { if (cb) cb(null); })
          .catch(function(e) { console.warn('[Cloud] 保存记录失败:', e); if (cb) cb(null); });
      } else {
        localSaveHistory(type, detail);
        if (cb) cb(null);
      }
    });
  }

  function loadHistory(cb) {
    onReady(function() {
      if (isCloud()) {
        if (!_accessToken) { cb(null, []); return; }
        var userId = _parseJwt(_accessToken).sub;
        _restGet('user_history', '?select=*&user_id=eq.' + userId + '&order=created_at.desc&limit=100')
          .then(function(data) {
            var items = (data || []).map(function(r) {
              return { type: r.type, detail: r.detail, time: r.created_at };
            });
            cb(null, items);
          }).catch(function(e) { cb(cloudErr(e)); });
      } else {
        cb(null, localLoadHistory());
      }
    });
  }

  function clearHistory(cb) {
    onReady(function() {
      if (isCloud()) {
        if (!_accessToken) { if (cb) cb(null); return; }
        var userId = _parseJwt(_accessToken).sub;
        _restDelete('user_history', '?user_id=eq.' + userId)
          .then(function() { if (cb) cb(null); })
          .catch(function(e) { if (cb) cb(cloudErr(e)); });
      } else {
        localClearHistory();
        if (cb) cb(null);
      }
    });
  }

  // ===== JWT 解析 =====
  function _parseJwt(token) {
    try {
      var parts = token.split('.');
      if (parts.length !== 3) return {};
      var payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(atob(payload).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')));
    } catch(e) { return {}; }
  }

  // ===== 错误处理 =====
  function _isAuthError(res) {
    return !!(res && (res.error || res.error_code || (typeof res.code === 'number' && res.code >= 400)));
  }

  function cloudErr(e) {
    var msg = '';
    var code = '';
    if (typeof e === 'string') return e;
    if (e && e.error_code) code = e.error_code;
    if (e && e.message) msg = e.message;
    else if (e && e.msg) msg = e.msg;
    else if (e && e.error_description) msg = e.error_description;
    else if (e && e.error) msg = typeof e.error === 'string' ? e.error : e.error.message || '';
    else msg = '操作失败';

    // 按 error_code 翻译
    var codeMap = {
      'over_email_send_rate_limit': '发送邮件过于频繁，请稍后再试',
      'over_request_rate_limit': '请求过于频繁，请稍后再试',
      'invalid_credentials': '用户名或密码错误',
      'user_not_found': '用户不存在',
      'email_exists': '该邮箱已注册',
      'phone_exists': '该手机号已注册',
      'invalid_email': '邮箱格式不正确',
      'invalid_phone': '手机号格式不正确',
      'weak_password': '密码强度不够，请设置更复杂的密码',
      'signup_disabled': '注册功能已关闭',
      'provider_disabled': '该登录方式未启用',
      'invalid_oauth_state': '第三方登录失败，请重试',
      'session_not_found': '登录已过期，请重新登录'
    };
    if (code && codeMap[code]) return codeMap[code];

    // 按 msg 文本翻译
    var map = {
      'User already registered': '该账号已注册',
      'Invalid login credentials': '用户名或密码错误',
      'Email not confirmed': '请先验证邮箱',
      'Phone not confirmed': '请先验证手机号',
      'Rate limit exceeded': '操作过于频繁，请稍后再试',
      'Invalid email': '邮箱格式不正确',
      'Invalid phone': '手机号格式不正确',
      'Password should be at least 6 characters': '密码至少6位',
      'Password should be at least 6 characters.': '密码至少6位',
      'Token has expired or is invalid': '验证码已过期',
      'Invalid OTP': '验证码错误',
      'User not found': '用户不存在',
      'Network request failed': '网络连接失败，请检查网络',
      'Email rate limit exceeded': '发送邮件过于频繁，请稍后再试',
      'SMS rate limit exceeded': '发送短信过于频繁，请稍后再试',
      'To signup, please provide your email': '请输入邮箱地址',
      'To signup, please provide your phone': '请输入手机号',
      'Password is too weak': '密码强度不够，请设置更复杂的密码',
      'Unable to validate email address': '无法验证邮箱地址',
      'Signup requires a valid password': '请输入有效密码',
      'A user with this email already exists': '该邮箱已注册',
      'A user with this phone already exists': '该手机号已注册',
      'No user found with this email': '该邮箱未注册',
      'No user found with this phone': '该手机号未注册',
      'Email link is invalid or has expired': '邮箱验证链接已失效',
      'Phone verification code has expired': '手机验证码已过期',
      'Phone verification code is invalid': '手机验证码错误',
      'Could not parse JWT access token': '登录已过期，请重新登录',
      'Token expired': '登录已过期，请重新登录',
      'Failed to fetch': '网络连接失败，请检查网络',
      'Failed to send verification email': '验证邮件发送失败，请稍后重试',
      'Signups not allowed for this instance': '当前不允许注册',
      'For security purposes, you can only request this once every 60 seconds': '操作过于频繁，请60秒后再试',
      'The password used is too weak. It should be at least 6 characters long.': '密码至少6位'
    };
    return map[msg] || msg;
  }

  // ===== 本地存储实现 =====
  function localGetUsers() { try { return JSON.parse(localStorage.getItem('tianji_users')) || {}; } catch(e) { return {}; } }
  function localGetSession() { try { return JSON.parse(localStorage.getItem('tianji_session')); } catch(e) { return null; } }
  function localGetCodes() { try { return JSON.parse(localStorage.getItem('tianji_codes')) || {}; } catch(e) { return {}; } }
  function localGetEmailMapping() { try { return JSON.parse(localStorage.getItem('tianji_email_map')) || {}; } catch(e) { return {}; } }
  function localHashPwd(p) { var h=0; for(var i=0;i<p.length;i++){h=((h<<5)-h+p.charCodeAt(i))|0;h=((h<<13)^h)|0;} return 'h'+Math.abs(h).toString(36)+p.length; }

  function localFindByContact(type, contact, users) {
    var keys = Object.keys(users);
    for (var i = 0; i < keys.length; i++) {
      var u = users[keys[i]];
      if (type === 'phone' && u.phone === contact) return u;
      if (type === 'email' && u.email === contact) return u;
    }
    return null;
  }

  function localSignUp(username, password, attrs) {
    var users = localGetUsers();
    if (users[username]) return null;
    users[username] = {
      username: username, nick: attrs.nick || username, password: localHashPwd(password),
      phone: attrs.phone || '', email: attrs.email || '',
      joined: new Date().toISOString(), history: []
    };
    localStorage.setItem('tianji_users', JSON.stringify(users));
    localStorage.setItem('tianji_session', JSON.stringify({ username: username, ts: Date.now() }));
    return users[username];
  }

  function localLogIn(username, password) {
    var users = localGetUsers();
    var user = users[username];
    if (!user) return null;
    if (user.password !== localHashPwd(password)) return null;
    localStorage.setItem('tianji_session', JSON.stringify({ username: username, ts: Date.now() }));
    return user;
  }

  function localLogInByContact(type, contact, password) {
    var users = localGetUsers();
    var user = localFindByContact(type, contact, users);
    if (!user) return null;
    if (user.password !== localHashPwd(password)) return null;
    localStorage.setItem('tianji_session', JSON.stringify({ username: user.username, ts: Date.now() }));
    return user;
  }

  function localSocialLogin(platform, cb) {
    var labels = { wechat: '微信', qq: 'QQ', apple: 'Apple' };
    var avatars = { wechat: '💚', qq: '💙', apple: '🍎' };
    var label = labels[platform] || platform;
    var avatar = avatars[platform] || '👤';
    var fakeId = platform + '_' + Math.random().toString(36).substr(2, 8);
    var users = localGetUsers();
    var found = null;
    var keys = Object.keys(users);
    for (var i = 0; i < keys.length; i++) {
      if (users[keys[i]].socialId === fakeId) { found = users[keys[i]]; break; }
    }
    if (found) {
      localStorage.setItem('tianji_session', JSON.stringify({ username: found.username, ts: Date.now() }));
      cb(null, found);
    } else {
      var nick = label + '用户' + Math.floor(Math.random() * 9000 + 1000);
      users[fakeId] = {
        username: fakeId, nick: nick, avatar: avatar,
        password: localHashPwd(Math.random().toString(36)),
        socialId: fakeId, socialType: platform,
        joined: new Date().toISOString(), history: []
      };
      localStorage.setItem('tianji_users', JSON.stringify(users));
      localStorage.setItem('tianji_session', JSON.stringify({ username: fakeId, ts: Date.now() }));
      cb(null, users[fakeId]);
    }
  }

  function localSaveHistory(type, detail) {
    var s = localGetSession();
    if (!s) return;
    var users = localGetUsers();
    var u = users[s.username];
    if (!u) return;
    if (!u.history) u.history = [];
    u.history.push({ type: type, detail: detail, time: new Date().toISOString() });
    if (u.history.length > 100) u.history = u.history.slice(-100);
    users[s.username] = u;
    localStorage.setItem('tianji_users', JSON.stringify(users));
  }

  function localLoadHistory() {
    var s = localGetSession();
    if (!s) return [];
    var users = localGetUsers();
    var u = users[s.username];
    return u ? (u.history || []) : [];
  }

  function localClearHistory() {
    var s = localGetSession();
    if (!s) return;
    var users = localGetUsers();
    if (users[s.username]) { users[s.username].history = []; }
    localStorage.setItem('tianji_users', JSON.stringify(users));
  }

  // ===== 导出 =====
  return {
    init: init,
    isCloud: isCloud,
    signUp: signUp,
    logIn: logIn,
    logInByPhone: logInByPhone,
    logInByEmail: logInByEmail,
    requestSmsCode: requestSmsCode,
    signUpOrLogInWithCode: signUpOrLogInWithCode,
    socialLogin: socialLogin,
    guestLogin: guestLogin,
    logOut: logOut,
    getCurrentUser: getCurrentUser,
    saveHistory: saveHistory,
    loadHistory: loadHistory,
    clearHistory: clearHistory,
    handleOAuthCallback: handleOAuthCallback,
    resetPassword: resetPassword
  };
})();
