const buildCrud = require('./_crudFactory');
module.exports = buildCrud({ table: 'app_consents', fields: ['app_name','scope','allowed_fields','status','expires_at'] });
