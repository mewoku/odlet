// Bridge to the hosting page (web/src/lib/unityBridge.ts). Returns window.__odletSession, the signed-in
// site session as JSON ({access_token, expires_at, user_id}), or "" when there is none.
mergeInto(LibraryManager.library, {
  OdletHost_GetSession: function () {
    var s = (typeof window !== 'undefined' && typeof window.__odletSession === 'string') ? window.__odletSession : '';
    var size = lengthBytesUTF8(s) + 1;
    var buffer = _malloc(size);
    stringToUTF8(s, buffer, size);
    return buffer;
  }
});
