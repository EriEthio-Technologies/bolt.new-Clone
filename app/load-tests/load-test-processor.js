module.exports = {
  generateRandomDocument,
  processResponse
};

const faker = require('faker');

function generateRandomDocument(userContext, events, done) {
  const documentTypes = ['pdf', 'docx'];
  const documentType = documentTypes[Math.floor(Math.random() * documentTypes.length)];
  
  userContext.vars.document = {
    name: faker.system.fileName(),
    type: documentType,
    size: faker.datatype.number({ min: 1000, max: 5000000 }), // 1KB to 5MB
    content: faker.lorem.paragraphs(3)
  };
  
  return done();
}

function processResponse(requestParams, response, context, ee, next) {
  if (response.statusCode >= 400) {
    console.error(`Error in request to ${requestParams.url}: ${response.statusCode}`);
    console.error('Response body:', response.body);
  }

  // Track custom metrics
  if (context.vars.metrics) {
    context.vars.metrics.push({
      timestamp: Date.now(),
      statusCode: response.statusCode,
      latency: response.timings.phases.firstByte,
      endpoint: requestParams.url
    });
  } else {
    context.vars.metrics = [{
      timestamp: Date.now(),
      statusCode: response.statusCode,
      latency: response.timings.phases.firstByte,
      endpoint: requestParams.url
    }];
  }

  return next();
}