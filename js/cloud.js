// ============================================================
// Cloud Module - 云端数据模块
// 支持 Supabase（云端）和 localStorage（本地）双模式
// ============================================================
var Cloud = (function() {
  var _mode = 'local';
  var _ready = false;
  var _pendingInit = [];
  var _supabase = null;

  // ===== 初始化 =====
  function init() {
    if (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.enabled &&
        SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey && typeof supabase !== 'undefined') {
      try {
        _supabase = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        _mode = 'cloud';
        console.log('[Cloud] Supabase 已连接');
      } catch (e) {
        console.warn('[Cloud] Supabase 初始化失败，使用本地模式', e);
      }
    } else {
      console.log('[Cloud] 本地模式（未配置 Supabase）');
    }
    _ready = true;
    for (var i = 0; i < _pendingInit.length; i++) _pendingInit[i]();
    _pendingInit = [];
  }

  function onReady(fn) { _ready ? fn() : _pendingInit.push(fn); }
  function isCloud() { return _mode === 'cloud'; }

  // ===== Supabase 用户 → 本地用户对象 =====
  function sbToLocal(authData, profile) {
    var meta = (authData && authData.user && authData.user.user_metadata) || {};
    return {
      username: (authData && authData.user && authData.user.email) || meta.username || (authData && authData.user && authData.user.id) || '',
      userId: (authData && authData.user && authData.user.id) || '',
      nick: (profile && profile.nick) || meta.nick || meta.full_name || '用户',
      phone: (authData && authData.user && authData.user.phone) || '',
      email: (authData && authData.user && authData.user.email) || '',
      avatar: (profile && profile.avatar) || meta.avatar || '',
      socialType: (profile && profile.social_type) || meta.socialType || '',
      isGuest: (profile && profile.is_guest) || false,
      joined: (authData && authData.user && authData.user.created_at) || new Date().toISOString(),
      history: []
    };
  }

  // ===== 注册 =====
  function signUp(username, password, attrs, cb) {
    onReady(function() {
      if (isCloud()) {
        var meta = { username: username };
        if (attrs.nick) meta.nick = attrs.nick;
        _supabase.auth.signUp({
          email: username + '@tianji.local',
          password: password,
          data: meta
        }).then(function(res) {
          if (res.error) { cb(cloudErr(res.error)); return; }
          // 创建 profile
          if (res.data && res.data.user) {
            _supabase.from('user_profiles').upsert({
              id: res.data.user.id,
              nick: attrs.nick || username
            }).then(function() {
              cb(null, sbToLocal(res.data, { nick: attrs.nick || username }));
            }).catch(function() {
              cb(null, sbToLocal(res.data, { nick: attrs.nick || username }));
            });
          } else {
            cb(null, sbToLocal(res.data, {}));
          }
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
        // Try email login with stored mapping
        var mapping = localGetEmailMapping();
        var email = mapping[username] || username;
        if (email.indexOf('@') === -1) email = email + '@tianji.local';
        _supabase.auth.signInWithPassword({ email: email, password: password })
          .then(function(res) {
            if (res.error) { cb(cloudErr(res.error)); return; }
            _supabase.from('user_profiles').select('*').eq('id', res.data.user.id).single()
              .then(function(pRes) {
                cb(null, sbToLocal(res.data, pRes.data));
              }).catch(function() {
                cb(null, sbToLocal(res.data, {}));
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
        _supabase.auth.signInWithPassword({ phone: phone, password: password })
          .then(function(res) {
            if (res.error) { cb(cloudErr(res.error)); return; }
            _supabase.from('user_profiles').select('*').eq('id', res.data.user.id).single()
              .then(function(pRes) {
                cb(null, sbToLocal(res.data, pRes.data));
              }).catch(function() {
                cb(null, sbToLocal(res.data, {}));
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
        _supabase.auth.signInWithPassword({ email: email, password: password })
          .then(function(res) {
            if (res.error) { cb(cloudErr(res.error)); return; }
            _supabase.from('user_profiles').select('*').eq('id', res.data.user.id).single()
              .then(function(pRes) {
                cb(null, sbToLocal(res.data, pRes.data));
              }).catch(function() {
                cb(null, sbToLocal(res.data, {}));
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
        if (isPhone) {
          _supabase.auth.signInWithOtp({ phone: contact })
            .then(function(res) {
              if (res.error) { cb(cloudErr(res.error)); return; }
              cb(null, null);
            }).catch(function(e) { cb(cloudErr(e)); });
        } else {
          _supabase.auth.signInWithOtp({ email: contact })
            .then(function(res) {
              if (res.error) { cb(cloudErr(res.error)); return; }
              cb(null, null);
            }).catch(function(e) { cb(cloudErr(e)); });
        }
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
        var params = isPhone ? { phone: contact, otp: code } : { email: contact, otp: code };
        _supabase.auth.verifyOtp(params)
          .then(function(res) {
            if (res.error) { cb(cloudErr(res.error)); return; }
            _supabase.from('user_profiles').select('*').eq('id', res.data.user.id).single()
              .then(function(pRes) {
                cb(null, sbToLocal(res.data, pRes.data));
              }).catch(function() {
                cb(null, sbToLocal(res.data, {}));
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
          var isPhone = /^1\d{10}$/.test(contact);
          var uname = isPhone ? ('u' + contact.substr(-4)) : ('e' + contact.split('@')[0] + '_' + Math.floor(Math.random() * 1000));
          var nick = isPhone ? (contact.substr(0,3) + '****' + contact.substr(7)) : contact.split('@')[0];
          users[uname] = { username: uname, nick: nick, password: '', phone: isPhone ? contact : '', email: isPhone ? '' : contact, joined: new Date().toISOString(), history: [] };
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
        var providerMap = {
          wechat: 'wechat',
          qq: 'qq',
          apple: 'apple'
        };
        var provider = providerMap[platform];
        if (!provider) { cb('不支持的平台'); return; }

        // Supabase OAuth
        _supabase.auth.signInWithOAuth({
          provider: provider,
          options: { redirectTo: window.location.origin + window.location.pathname }
        }).then(function(res) {
          if (res.error) {
            console.warn('[Cloud] OAuth 未配置，使用演示模式:', platform);
            localSocialLogin(platform, cb);
            return;
          }
          // Redirect will happen automatically
        }).catch(function(e) {
          console.warn('[Cloud] OAuth 失败，使用演示模式:', platform);
          localSocialLogin(platform, cb);
        });
      } else {
        localSocialLogin(platform, cb);
      }
    });
  }

  // ===== 游客登录 =====
  function guestLogin(cb) {
    onReady(function() {
      if (isCloud()) {
        var fakeEmail = 'guest_' + Math.random().toString(36).substr(2, 8) + '@tianji.guest';
        var fakePass = 'guest_' + Date.now();
        _supabase.auth.signUp({
          email: fakeEmail,
          password: fakePass,
          data: { isGuest: true, nick: '游客' }
        }).then(function(res) {
          if (res.error) { cb(cloudErr(res.error)); return; }
          if (res.data && res.data.user) {
            _supabase.from('user_profiles').upsert({
              id: res.data.user.id,
              nick: '游客',
              is_guest: true
            }).then(function() {
              cb(null, sbToLocal(res.data, { nick: '游客', is_guest: true }));
            }).catch(function() {
              cb(null, sbToLocal(res.data, { nick: '游客', is_guest: true }));
            });
          } else {
            cb(null, sbToLocal(res.data, { nick: '游客', is_guest: true }));
          }
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

  // ===== 退出 =====
  function logOut(cb) {
    onReady(function() {
      if (isCloud() && _supabase) {
        _supabase.auth.signOut().then(function() {
          localStorage.removeItem('tianji_session');
          if (cb) cb(null);
        }).catch(function() {
          localStorage.removeItem('tianji_session');
          if (cb) cb(null);
        });
      } else {
        localStorage.removeItem('tianji_session');
        if (cb) cb(null);
      }
    });
  }

  // ===== 获取当前用户 =====
  function getCurrentUser(cb) {
    onReady(function() {
      if (isCloud() && _supabase) {
        _supabase.auth.getSession().then(function(res) {
          if (res.data && res.data.session) {
            var authData = res.data;
            _supabase.from('user_profiles').select('*').eq('id', authData.session.user.id).single()
              .then(function(pRes) {
                cb(null, sbToLocal(authData, pRes.data));
              }).catch(function() {
                cb(null, sbToLocal(authData, {}));
              });
          } else {
            cb(null, null);
          }
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
      if (isCloud() && _supabase) {
        _supabase.auth.getSession().then(function(res) {
          if (!res.data || !res.data.session) { if (cb) cb(null); return; }
          _supabase.from('user_history').insert({
            user_id: res.data.session.user.id,
            type: type,
            detail: detail
          }).then(function() { if (cb) cb(null); })
            .catch(function(e) { console.warn('[Cloud] 保存记录失败:', e); if (cb) cb(null); });
        });
      } else {
        localSaveHistory(type, detail);
        if (cb) cb(null);
      }
    });
  }

  function loadHistory(cb) {
    onReady(function() {
      if (isCloud() && _supabase) {
        _supabase.auth.getSession().then(function(res) {
          if (!res.data || !res.data.session) { cb(null, []); return; }
          _supabase.from('user_history').select('*')
            .eq('user_id', res.data.session.user.id)
            .order('created_at', { ascending: false })
            .limit(100)
            .then(function(res) {
              if (res.error) { cb(cloudErr(res.error)); return; }
              var items = (res.data || []).map(function(r) {
                return { type: r.type, detail: r.detail, time: r.created_at };
              });
              cb(null, items);
            }).catch(function(e) { cb(cloudErr(e)); });
        });
      } else {
        cb(null, localLoadHistory());
      }
    });
  }

  function clearHistory(cb) {
    onReady(function() {
      if (isCloud() && _supabase) {
        _supabase.auth.getSession().then(function(res) {
          if (!res.data || !res.data.session) { if (cb) cb(null); return; }
          _supabase.from('user_history').delete()
            .eq('user_id', res.data.session.user.id)
            .then(function() { if (cb) cb(null); })
            .catch(function(e) { if (cb) cb(cloudErr(e)); });
        });
      } else {
        localClearHistory();
        if (cb) cb(null);
      }
    });
  }

  // ===== 错误处理 =====
  function cloudErr(e) {
    var msg = '';
    if (typeof e === 'string') return e;
    if (e && e.message) msg = e.message;
    else if (e && e.msg) msg = e.msg;
    else if (e && e.error_description) msg = e.error_description;
    else msg = '操作失败';
    var map = {
      'User already registered': '该账号已注册',
      'Invalid login credentials': '用户名或密码错误',
      'Email not confirmed': '请先验证邮箱',
      'Phone not confirmed': '请先验证手机号',
      'Rate limit exceeded': '操作过于频繁，请稍后再试',
      'Invalid email': '邮箱格式不正确',
      'Password should be at least 6 characters': '密码至少6位',
      'Token has expired or is invalid': '验证码已过期',
      'Invalid OTP': '验证码错误',
      'User not found': '用户不存在',
      'Network request failed': '网络连接失败，请检查网络'
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
    clearHistory: clearHistory
  };
})();
