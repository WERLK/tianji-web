// ============================================================
// Cloud Module - 云端数据模块
// 支持 LeanCloud（云端）和 localStorage（本地）双模式
// ============================================================
var Cloud = (function() {
  var _mode = 'local';
  var _ready = false;
  var _pendingInit = [];

  // ===== 初始化 =====
  function init() {
    if (typeof LC_CONFIG !== 'undefined' && LC_CONFIG.enabled && LC_CONFIG.appId && typeof AV !== 'undefined') {
      try {
        AV.init({
          appId: LC_CONFIG.appId,
          appKey: LC_CONFIG.appKey,
          serverURL: LC_CONFIG.serverURL
        });
        _mode = 'cloud';
        console.log('[Cloud] LeanCloud 已连接');
      } catch (e) {
        console.warn('[Cloud] LeanCloud 初始化失败，使用本地模式', e);
      }
    } else {
      console.log('[Cloud] 本地模式（未配置 LeanCloud）');
    }
    _ready = true;
    for (var i = 0; i < _pendingInit.length; i++) _pendingInit[i]();
    _pendingInit = [];
  }

  function onReady(fn) { _ready ? fn() : _pendingInit.push(fn); }
  function isCloud() { return _mode === 'cloud'; }

  // ===== LeanCloud 用户 → 本地用户对象 =====
  function avToLocal(u) {
    return {
      username: u.getUsername() || u.id,
      nick: u.get('nick') || u.getUsername() || u.get('nickname') || '用户',
      phone: u.get('mobilePhoneNumber') || '',
      email: u.get('email') || '',
      avatar: u.get('avatar') || '',
      socialType: u.get('socialType') || '',
      isGuest: u.get('isGuest') || false,
      joined: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
      history: []
    };
  }

  // ===== 注册 =====
  function signUp(username, password, attrs, cb) {
    onReady(function() {
      if (isCloud()) {
        var user = new AV.User();
        user.setUsername(username);
        user.setPassword(password);
        if (attrs.nick) user.set('nick', attrs.nick);
        if (attrs.phone) user.setMobilePhoneNumber(attrs.phone);
        if (attrs.email) user.setEmail(attrs.email);
        user.signUp().then(function(u) { cb(null, avToLocal(u)); })
          .catch(function(e) { cb(cloudErr(e)); });
      } else {
        cb(null, localSignUp(username, password, attrs));
      }
    });
  }

  // ===== 登录 =====
  function logIn(username, password, cb) {
    onReady(function() {
      if (isCloud()) {
        AV.User.logIn(username, password).then(function(u) { cb(null, avToLocal(u)); })
          .catch(function(e) { cb(cloudErr(e)); });
      } else {
        cb(null, localLogIn(username, password));
      }
    });
  }

  function logInByPhone(phone, password, cb) {
    onReady(function() {
      if (isCloud()) {
        AV.User.logInWithMobilePhone(phone, password).then(function(u) { cb(null, avToLocal(u)); })
          .catch(function(e) { cb(cloudErr(e)); });
      } else {
        cb(null, localLogInByContact('phone', phone, password));
      }
    });
  }

  function logInByEmail(email, password, cb) {
    onReady(function() {
      if (isCloud()) {
        AV.User.logInWithEmail(email, password).then(function(u) { cb(null, avToLocal(u)); })
          .catch(function(e) { cb(cloudErr(e)); });
      } else {
        cb(null, localLogInByContact('email', email, password));
      }
    });
  }

  // ===== 验证码 =====
  function requestSmsCode(phone, cb) {
    onReady(function() {
      if (isCloud()) {
        AV.User.requestLoginSmsCode(phone).then(function() { cb(null, null); })
          .catch(function(e) { cb(cloudErr(e)); });
      } else {
        var code = String(Math.floor(100000 + Math.random() * 900000));
        var codes = localGetCodes();
        codes[phone] = { code: code, ts: Date.now() };
        localStorage.setItem('tianji_codes', JSON.stringify(codes));
        cb(null, code);
      }
    });
  }

  function signUpOrLogInWithCode(phone, code, cb) {
    onReady(function() {
      if (isCloud()) {
        AV.User.signUpOrlogInWithMobilePhone(phone, code).then(function(u) { cb(null, avToLocal(u)); })
          .catch(function(e) { cb(cloudErr(e)); });
      } else {
        var codes = localGetCodes();
        if (!codes[phone] || codes[phone].code !== code) { cb('验证码错误'); return; }
        if (Date.now() - codes[phone].ts > 300000) { cb('验证码已过期'); return; }
        var users = localGetUsers();
        var found = localFindByContact('phone', phone, users);
        if (found) { cb(null, found); }
        else {
          var uname = 'u' + phone.substr(-4);
          users[uname] = { username: uname, nick: phone.substr(0,3) + '****' + phone.substr(7), password: '', phone: phone, joined: new Date().toISOString(), history: [] };
          localStorage.setItem('tianji_users', JSON.stringify(users));
          cb(null, users[uname]);
        }
      }
    });
  }

  // ===== 社交登录 =====
  function socialLogin(platform, cb) {
    onReady(function() {
      if (isCloud()) {
        // LeanCloud 会自动处理 OAuth 跳转
        // 需要在 LeanCloud 控制台配置社交账号
        var providers = {
          wechat: 'weixin',
          qq: 'qq',
          apple: 'apple'
        };
        var provider = providers[platform];
        if (!provider) { cb('不支持的平台'); return; }

        // 尝试使用 LeanCloud 内置的 OAuth
        AV.User.logInWithAuthData({}, provider).then(function(u) {
          cb(null, avToLocal(u));
        }).catch(function(e) {
          // 如果 LeanCloud 未配置该平台，回退到演示模式
          console.warn('[Cloud] 社交登录未配置，使用演示模式:', platform);
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
        var user = new AV.User();
        user.set('isGuest', true);
        user.signUp().then(function(u) {
          u.set('nick', '游客');
          u.save().then(function() { cb(null, avToLocal(u)); });
        }).catch(function(e) { cb(cloudErr(e)); });
      } else {
        var guestId = 'guest_' + Math.random().toString(36).substr(2, 8);
        var users = localGetUsers();
        users[guestId] = { username: guestId, nick: '游客', password: '', isGuest: true, joined: new Date().toISOString(), history: [] };
        localStorage.setItem('tianji_users', JSON.stringify(users));
        cb(null, users[guestId]);
      }
    });
  }

  // ===== 退出 =====
  function logOut(cb) {
    onReady(function() {
      if (isCloud()) { try { AV.User.logOut(); } catch(e) {} }
      localStorage.removeItem('tianji_session');
      if (cb) cb(null);
    });
  }

  // ===== 获取当前用户 =====
  function getCurrentUser(cb) {
    onReady(function() {
      if (isCloud()) {
        var current = AV.User.current();
        if (current) {
          // 尝试刷新
          current.fetch().then(function(u) { cb(null, avToLocal(u)); })
            .catch(function() { cb(null, avToLocal(current)); });
        } else {
          cb(null, null);
        }
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
        var cls = LC_CONFIG.historyClass || 'UserHistory';
        var obj = AV.Object.extend(cls);
        var item = new obj();
        item.set('type', type);
        item.set('detail', detail);
        item.set('user', AV.User.current());
        item.save().then(function() { if (cb) cb(null); })
          .catch(function(e) { if (cb) cb(cloudErr(e)); });
      } else {
        localSaveHistory(type, detail);
        if (cb) cb(null);
      }
    });
  }

  function loadHistory(cb) {
    onReady(function() {
      if (isCloud()) {
        var cls = LC_CONFIG.historyClass || 'UserHistory';
        var query = new AV.Query(cls);
        query.equalTo('user', AV.User.current());
        query.descending('createdAt');
        query.limit(100);
        query.find().then(function(results) {
          var items = results.map(function(r) {
            return { type: r.get('type'), detail: r.get('detail'), time: r.createdAt.toISOString() };
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
        var cls = LC_CONFIG.historyClass || 'UserHistory';
        var query = new AV.Query(cls);
        query.equalTo('user', AV.User.current());
        query.limit(1000);
        query.find().then(function(results) {
          if (results.length === 0) { if (cb) cb(null); return; }
          AV.Object.destroyAll(results).then(function() { if (cb) cb(null); })
            .catch(function(e) { if (cb) cb(cloudErr(e)); });
        }).catch(function(e) { if (cb) cb(cloudErr(e)); });
      } else {
        localClearHistory();
        if (cb) cb(null);
      }
    });
  }

  // ===== 错误处理 =====
  function cloudErr(e) {
    var msg = (e && e.message) || '操作失败';
    // 翻译常见错误
    var map = {
      'Username is already taken.': '用户名已存在',
      'Mobile phone number is already taken.': '该手机号已注册',
      'Email is already taken.': '该邮箱已注册',
      'Username or password is incorrect.': '用户名或密码错误',
      'The mobile phone number is not valid.': '手机号格式不正确',
      'Cannot find user.': '用户不存在',
      'Password is required.': '请输入密码',
      'The SMS code is not correct.': '验证码错误',
      'The SMS code has expired.': '验证码已过期',
      'Sms code send limit exceeded.': '验证码发送过于频繁，请稍后再试'
    };
    return map[msg] || msg;
  }

  // ===== 本地存储实现 =====
  function localGetUsers() { try { return JSON.parse(localStorage.getItem('tianji_users')) || {}; } catch(e) { return {}; } }
  function localGetSession() { try { return JSON.parse(localStorage.getItem('tianji_session')); } catch(e) { return null; } }
  function localGetCodes() { try { return JSON.parse(localStorage.getItem('tianji_codes')) || {}; } catch(e) { return {}; } }
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
