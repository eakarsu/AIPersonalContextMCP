const buildCrud = require('./_crudFactory');
module.exports = buildCrud({ table: 'data_sources', fields: ['connector_name','source_type','status','schema_name'] });
