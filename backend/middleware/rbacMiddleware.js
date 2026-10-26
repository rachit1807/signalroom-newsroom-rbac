import jwt from "jsonwebtoken";
import { fail, publicUser } from "../domain.js";
export const authenticate = (store, secret) => async (req, res, next) => {
  try {
    const raw = req.cookies.signalroom;
    if (!raw) fail(401, "Sign in to enter the newsroom.");
    let claims;
    try {
      claims = jwt.verify(raw, secret, { algorithms: ["HS256"] });
    } catch {
      fail(401, "Your session expired. Please sign in again.");
    }
    const user = await store.read((s) => {
      const session = s.sessions.find(
        (x) =>
          x.id === claims.sid &&
          x.userId === claims.sub &&
          x.expires > Date.now(),
      );
      return session ? s.users.find((u) => u.id === session.userId) : null;
    });
    if (!user) fail(401, "Your session expired. Please sign in again.");
    req.user = user;
    req.sessionId = claims.sid;
    next();
  } catch (e) {
    next(e);
  }
};
export const requireRoles =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(
        Object.assign(new Error("Your role does not allow this action."), {
          status: 403,
        }),
      );
    next();
  };
export { publicUser };
