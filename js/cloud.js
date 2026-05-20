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
        if (profiles && profiles.length > 0) {
          // 补填 email（如果缺失）
          var p = profiles[0];
          if (!p.email && user.email) {
            return _restPost('user_profiles', { id: user.id, email: user.email }, true)
              .then(function() { return p; })
              .catch(function() { return p; });
          }
          return Promise.resolve(p);
        }
        // profile 不存在，自动创建
        var meta = user.user_metadata || {};
        var nick = meta.nick || meta.username || user.email || '用户';
        return _restPost('user_profiles', { id: user.id, nick: nick, email: user.email || '' }, true)
          .then(function() { return { id: user.id, nick: nick, email: user.email || '', avatar: '', social_type: '', is_guest: false }; })
          .catch(function() { return { id: user.id, nick: nick, email: user.email || '', avatar: '', social_type: '', is_guest: false }; });
      })
      .catch(function() {
        var meta = user.user_metadata || {};
        var nick = meta.nick || meta.username || user.email || '用户';
        return { id: user.id, nick: nick, email: user.email || '', avatar: '', social_type: '', is_guest: false };
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

  // ===== 忘记密码（Resend 直发 + Supabase 兜底） =====
  function resetPassword(email, cb) {
    onReady(function() {
      if (!isCloud()) { cb('本地模式不支持密码重置'); return; }
      var done = false;
      function finish(err) { if (!done) { done = true; cb(err); } }

      // 1. 查找用户 profile
      _restGet('user_profiles', '?select=id,nick,email&email=eq.' + encodeURIComponent(email))
        .then(function(profiles) {
          if (!Array.isArray(profiles) || profiles.length === 0) {
            var uname = email.split('@')[0];
            return _restGet('user_profiles', '?select=id,nick,email&nick=eq.' + encodeURIComponent(uname));
          }
          return profiles;
        })
        .then(function(profiles) {
          if (!Array.isArray(profiles) || profiles.length === 0) { finish('该邮箱未注册'); return; }
          var p = profiles[0];
          // 2. 生成一次性 token 并存储
          var token = 'rst_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 12);
          var expires = Date.now() + 30 * 60 * 1000;
          return _restPost('user_profiles', { id: p.id, reset_token: token, reset_expires: expires, email: email }, true)
            .then(function() { return token; });
        })
        .then(function(token) {
          if (!token) return;
          // 3. 用 Resend 发邮件
          var resetUrl = window.location.origin + window.location.pathname + '?reset=' + token;
          var resendKey = (typeof RESEND_KEY !== 'undefined') ? RESEND_KEY : '';
          var host = window.location.hostname;
          var fromAddr = (host === 'localhost' || host === '127.0.0.1') ? 'onboarding@resend.dev' : 'noreply@' + host;
          if (resendKey) {
            return fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: fromAddr,
                to: email,
                subject: '天机阁 - 密码重置',
                html: '<div style="max-width:480px;margin:0 auto;padding:32px 20px;font-family:-apple-system,sans-serif;background:#0a0a1a;color:#e8d5a8;border-radius:12px;border:1px solid rgba(201,169,110,0.3)">' +
                  '<div style="text-align:center;margin-bottom:24px"><span style="font-size:36px">🔮</span></div>' +
                  '<h2 style="text-align:center;color:#c9a96e;margin:0 0 8px">密码重置</h2>' +
                  '<p style="color:#aaa;text-align:center;margin:0 0 24px">你正在重置天机阁账号的密码，点击下方按钮设置新密码：</p>' +
                  '<div style="text-align:center"><a href="' + resetUrl + '" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#c9a96e,#a08050);color:#0a0a1a;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">重置密码</a></div>' +
                  '<p style="color:#666;font-size:12px;text-align:center;margin:24px 0 0">链接30分钟内有效。如非本人操作请忽略。</p>' +
                  '<div style="text-align:center;margin-top:16px;color:#555;font-size:11px">— 天机阁</div></div>'
              })
            }).then(function(r) { return r.json(); })
              .then(function(res) {
                if (res && res.error) throw new Error('resend_fail');
                finish(null);
              })
              .catch(function() {
                return _authPost('/recover', { email: email }).then(function(r) {
                  if (_isAuthError(r)) { finish(cloudErr(r)); return; }
                  finish(null);
                });
              });
          } else {
            return _authPost('/recover', { email: email }).then(function(r) {
              if (_isAuthError(r)) { finish(cloudErr(r)); return; }
              finish(null);
            });
          }
        })
        .catch(function(e) { finish(cloudErr(e)); });
    });
  }

  // ===== 验证自定义重置 token =====
  function verifyResetToken(token, cb) {
    onReady(function() {
      if (!isCloud()) { cb('本地模式不支持'); return; }
      _restGet('user_profiles', '?select=id,nick,reset_token,reset_expires&reset_token=eq.' + encodeURIComponent(token))
        .then(function(profiles) {
          if (!profiles || profiles.length === 0) { cb('链接无效或已过期'); return; }
          var p = profiles[0];
          if (!p.reset_expires || Date.now() > p.reset_expires) { cb('链接已过期，请重新申请'); return; }
          cb(null, { userId: p.id, nick: p.nick });
        })
        .catch(function() { cb('验证失败'); });
    });
  }

  // ===== 通过自定义 token 设置新密码 =====
  function resetPasswordWithToken(token, newPassword, cb) {
    onReady(function() {
      if (!isCloud()) { cb('本地模式不支持'); return; }
      verifyResetToken(token, function(err, data) {
        if (err) { cb(err); return; }
        // 用 Supabase admin API 更新密码
        fetch(_url + '/auth/v1/admin/users/' + data.userId, {
          method: 'PUT',
          headers: { 'apikey': _key, 'Authorization': 'Bearer ' + _key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPassword })
        }).then(function(r) { return r.json(); })
          .then(function(res) {
            // 清除 token
            _restPost('user_profiles', { id: data.userId, reset_token: null, reset_expires: null }, true).catch(function() {});
            if (res && (res.error || res.error_code)) { cb('密码重置失败'); return; }
            cb(null);
          })
          .catch(function() { cb('密码重置失败，请稍后重试'); });
      });
    });
  }

  // ===== 通过 Supabase recovery token 设置新密码 =====
  function updatePasswordWithToken(accessToken, newPassword, cb) {
    fetch(_url + '/auth/v1/user', {
      method: 'PUT',
      headers: {
        'apikey': _key,
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password: newPassword })
    }).then(function(r) { return r.json(); })
      .then(function(res) {
        if (res && (res.error || res.error_code || res.msg)) { cb(cloudErr(res)); return; }
        cb(null);
      })
      .catch(function() { cb('密码重置失败，请稍后重试'); });
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

  // ===== Realtime 实时同步（WebSocket） =====
  var _rtWs = null;
  var _rtRef = 0;
  var _rtHeartbeat = null;
  var _rtUserId = '';
  var _rtCallbacks = { onHistoryChange: null };

  function _rtSend(topic, event, payload) {
    if (!_rtWs || _rtWs.readyState !== 1) return;
    _rtWs.send(JSON.stringify({ topic: topic, event: event, payload: payload, ref: String(++_rtRef) }));
  }

  function _rtJoin(table, userId) {
    var channel = 'realtime:public:' + table;
    _rtSend(channel, 'phx_join', {
      config: {
        broadcast: { self: false },
        presence: { key: '' },
        private: false
      },
      postgres_changes: [{
        event: '*',
        schema: 'public',
        table: table,
        filter: 'user_id=eq.' + userId
      }]
    });
  }

  function _rtConnect(userId) {
    if (!isCloud() || !userId || _rtWs) return;
    _rtUserId = userId;
    try {
      var wsUrl = _url.replace(/^https/, 'wss').replace(/^http/, 'ws') + '/realtime/v1/websocket?apikey=' + _key + '&vsn=1.0.0';
      _rtWs = new WebSocket(wsUrl);
      _rtWs.onopen = function() {
        _rtJoin('user_history', userId);
        _rtHeartbeat = setInterval(function() { _rtSend('phoenix', 'heartbeat', {}); }, 30000);
      };
      _rtWs.onmessage = function(e) {
        try {
          var msg = JSON.parse(e.data);
          if (msg.event === 'postgres_changes' && msg.payload && msg.payload.data) {
            var d = msg.payload.data;
            if (_rtCallbacks.onHistoryChange) _rtCallbacks.onHistoryChange(d.type, d.record, d.old_record);
          }
        } catch(err) {}
      };
      _rtWs.onclose = function() {
        _rtWs = null;
        if (_rtHeartbeat) { clearInterval(_rtHeartbeat); _rtHeartbeat = null; }
        if (_rtUserId) setTimeout(function() { _rtConnect(_rtUserId); }, 5000);
      };
      _rtWs.onerror = function() { if (_rtWs) _rtWs.close(); };
    } catch(e) {}
  }

  function startRealtime(userId, callbacks) {
    if (callbacks) _rtCallbacks = callbacks;
    _rtConnect(userId);
  }

  function stopRealtime() {
    _rtUserId = '';
    if (_rtWs) { _rtWs.close(); _rtWs = null; }
    if (_rtHeartbeat) { clearInterval(_rtHeartbeat); _rtHeartbeat = null; }
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
    resetPassword: resetPassword,
    verifyResetToken: verifyResetToken,
    resetPasswordWithToken: resetPasswordWithToken,
    updatePasswordWithToken: updatePasswordWithToken,
    startRealtime: startRealtime,
    stopRealtime: stopRealtime
  };
})();
