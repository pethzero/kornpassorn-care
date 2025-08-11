import csurf = require('csurf');
export const csrfProtection = csurf({ cookie: true });