let session = [];

export function startSession() {
  session = [];
}

export function addSet(set) {
  session.push(set);
}

export function getSession() {
  return session;
}

export function clearSession() {
  session = [];
}