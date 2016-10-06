'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var packagejs = require(__dirname + '/../../package.json');
var semver = require('semver');
var request = require('sync-request');
var path = require('path');
var shelljs = require('shelljs');
var CodeGen = require('swagger-js-codegen').CodeGen;
var _ = require('underscore.string');

// Stores JHipster variables
var jhipsterVar = {moduleName: 'swagger-cli'};

// Stores JHipster functions
var jhipsterFunc = {};

function isURL(str) {
  return /\b(https?|ftp|file):\/\/[\-A-Za-z0-9+&@#\/%?=~_|!:,.;]*[\-A-Za-z0-9+&@#\/%=~_|‌​]/.test(str);
}

var apis;

module.exports = yeoman.Base.extend({

  initializing: {
    compose: function (args) {
      this.composeWith('jhipster:modules',
        {
          options: {
            jhipsterVar: jhipsterVar,
            jhipsterFunc: jhipsterFunc
          }
        },
        this.options.testmode ? {local: require.resolve('generator-jhipster/modules')} : null
      );
    },
    displayLogo: function () {
      // Have Yeoman greet the user.
      this.log('Welcome to the ' + chalk.red('JHipster swagger-cli') + ' generator! ' +
        chalk.yellow('v' + packagejs.version + '\n'));
    },
    readConfig: function () {
      apis = this.config.get('apis') || {};
      this.hasBackEnd = false;
      var jhipsterVersion = this.fs.readJSON('.yo-rc.json')['generator-jhipster'].jhipsterVersion;
      this.isJHipsterV2 = (!jhipsterVersion || semver.lt(jhipsterVersion, '3.0.0'));
    }
  },

  prompting: {
    askForRegistryUrl: askForRegistryUrl,
    askForGatewayName: askForGatewayName,
    askIfUsingRegistry: askIfUsingRegistry,
    askQuestions: function () {
      var done = this.async();
      var hasExistingApis = (Object.keys(apis).length !== 0);
      var inputSpec = this.inputSpec;

      var prompts = [
        {
          when: function () {
            return hasExistingApis;
          },
          type: 'list',
          name: 'action',
          message: 'What do you want to do ?',
          choices: [
            {
              value: 'new',
              name: 'Generate a new API client'
            },
            {
              value: 'all',
              name: 'Generate all stored API clients'
            },
            {
              value: 'select',
              name: 'Select stored API clients to generate'
            }
          ]
        },
        {
          when: function (response) {
            return (response.action == 'new' || !hasExistingApis) && inputSpec == undefined;
          },
          type: 'input',
          name: 'inputSpec',
          message: 'Where is your Swagger/OpenAPI spec (URL or path) ?',
          default: 'http://petstore.swagger.io/v2/swagger.json',
          store: true
        },
        {
          when: function (response) {
            return response.action == 'new' || !hasExistingApis;
          },
          type: 'input',
          name: 'cliName',
          validate: function (input) {
            if (!/^([a-zA-Z0-9_]*)$/.test(input)) return 'Your API client name cannot contain special characters or a blank space';
            if (input == '') return 'Your API client name cannot be empty';
            return true;
          },
          message: 'What is the unique name for your API client ?',
          default: this.clientName,
          store: true
        },
        {
          when: function (response) {
            return response.action == 'new' || !hasExistingApis;
          },
          type: 'checkbox',
          name: 'cliTypes',
          message: 'Select which type of API client to generate',
          default: ['front'],
          store: true,
          choices: [
            {'name': 'front-end client', 'value': 'front'},
            {'name': 'back-end client', 'value': 'back'},
          ]
        },
        {
          when: function (response) {
            return response.action == 'new' || !hasExistingApis;
          },
          type: 'confirm',
          name: 'saveConfig',
          message: 'Do you want to save this config for future reuse ?',
          default: false
        },
        {
          when: function (response) {
            return response.action == 'select';
          },
          type: 'checkbox',
          name: 'selected',
          message: 'Select which APIs you want to generate',
          choices: function () {
            var choices = [];
            Object.keys(apis).forEach(function (cliName) {
              choices.push({
                'name': cliName + ' (' + apis[cliName].spec + ' - ' + apis[cliName].cliTypes + ')',
                'value': {'cliName': cliName, 'spec': apis[cliName]}
              });
            });
            return choices;
          }
        }
      ];

      this.prompt(prompts, function (props) {
        this.props = props;
        this.props.inputSpec = this.inputSpec

        done();
      }.bind(this));
    }

  },

  configuring: {
    determineApisToGenerate: function () {
      this.apisToGenerate = {};
      if (this.props.action == 'new' || this.props.action == undefined) {
        this.apisToGenerate[this.props.cliName] = {
          'spec': this.props.inputSpec,
          'cliTypes': this.props.cliTypes,
          'apiName': this.apiName
        };
      } else if (this.props.action == 'all') {
        this.apisToGenerate = apis;
      } else if (this.props.action == 'select') {
        this.props.selected.forEach(function (selection) {
          this.apisToGenerate[selection.cliName] = selection.spec;
        }, this);
      }
    },

    saveConfig: function () {
      if (this.props.saveConfig) {
        apis[this.props.cliName] = this.apisToGenerate[this.props.cliName];
        this.config.set('apis', apis);
      }
    }
  },

  writing: {
    callSwaggerCodegen: function () {
      this.packageName = jhipsterVar.packageName;
      var jarPath = path.resolve(__dirname, '../jar/swagger-codegen-cli-2.2.2-SNAPSHOT.jar');
      Object.keys(this.apisToGenerate).forEach(function (cliName) {
        var inputSpec = this.apisToGenerate[cliName].spec;
        this.apiName = this.apisToGenerate[cliName].apiName;
        this.apisToGenerate[cliName].cliTypes.forEach(function (cliType) {
          this.log(chalk.green('Generating ' + cliType + ' end code for ' + cliName + ' (' + inputSpec + ')'));
          if (cliType === 'front') {
            this.hasFrontend = true;
            var swagger = "";
            if (isURL(inputSpec)) {
              var res = request('GET', inputSpec);
              swagger = res.getBody('utf-8');
            } else {
              swagger = fs.readFileSync(inputSpec, 'utf-8');
            }
            swagger = JSON.parse(swagger);
            var angularjsSourceCode = CodeGen.getAngularCode({
              className: _.classify(cliName),
              swagger: swagger,
              moduleName: _.camelize(cliName)
            });
            var apiScriptFile = 'components/api-clients/' + _.dasherize(_.decapitalize(cliName)) + '.module.js';

            //Determine if jhipster version is 2.x or 3.x
            if (!this.isJHipsterV2) {
              this.fs.write(jhipsterVar.webappDir + '/app/' + apiScriptFile, angularjsSourceCode);
            } else {
              this.fs.write(jhipsterVar.webappDir + '/scripts/' + apiScriptFile, angularjsSourceCode);
              jhipsterFunc.addJavaScriptToIndex(apiScriptFile);
            }
            jhipsterFunc.addAngularJsModule(_.camelize(cliName));
          }
          else if (cliType === 'back') {
            this.hasBackEnd = true;
            this.cliName = _.camelize(cliName);
            this.cliPackage = jhipsterVar.packageName + '.client.' + this.apiName;
            this.currentDir = shelljs.pwd();
            this.tempDir = shelljs.tempdir() + '/jhipster-swagger-cli/' + this.apiName;
            var execLine = 'java -Dmodels -Dapis -jar ' + jarPath +
              ' generate --lang spring --library spring-cloud' +
              ' --output ' + this.tempDir +
              ' --template-dir ' + path.resolve(__dirname, 'templates/swagger-codegen/libraries/spring-cloud') +
              ' --input-spec ' + inputSpec +
              ' --artifact-id ' + this.cliName +
              ' --api-package ' + this.cliPackage + '.api' +
              ' --model-package ' + this.cliPackage + '.model' +
              ' --additional-properties dateLibrary=custom,apiClassname=' + this.cliName + ',baseName=' + this.apiName +
              ' --type-mappings DateTime=ZonedDateTime' +
              ' --import-mappings ZonedDateTime=java.time.ZonedDateTime' +
              ' -DbasePackage=' + jhipsterVar.packageName + '.client';

            // this.log(execLine);
            shelljs.exec(execLine, {silent: true});
          }
        }, this);
      }, this);
    },

    writeTemplates: function () {

      if (!this.hasBackEnd) {
        return;
      }
      if (jhipsterVar.applicationType === 'microservice' || jhipsterVar.applicationType === 'gateway' || jhipsterVar.applicationType === 'uaa') {
        if (jhipsterVar.buildTool === 'maven') {
          jhipsterFunc.addMavenDependency('org.springframework.cloud', 'spring-cloud-starter-feign');
        } else if (jhipsterVar.buildTool === 'gradle') {
          jhipsterFunc.addGradleDependency('compile', 'org.springframework.cloud', 'spring-cloud-starter-feign');
        }
      } else {
        if (jhipsterVar.buildTool === 'maven') {
          jhipsterFunc.addMavenDependency('org.springframework.cloud', 'spring-cloud-starter', '1.1.1.RELEASE');
          jhipsterFunc.addMavenDependency('org.springframework.cloud', 'spring-cloud-netflix-core', '1.1.3.RELEASE');
          jhipsterFunc.addMavenDependency('com.netflix.feign', 'feign-core', '8.16.2');
          jhipsterFunc.addMavenDependency('com.netflix.feign', 'feign-slf4j', '8.16.2');
          jhipsterFunc.addMavenDependency('org.springframework.cloud', 'spring-cloud-starter-oauth2', '1.1.0.RELEASE');
        } else if (jhipsterVar.buildTool === 'gradle') {
          jhipsterFunc.addGradleDependency('compile', 'org.springframework.cloud', 'spring-cloud-starter', '1.1.1.RELEASE');
          jhipsterFunc.addGradleDependency('compile', 'org.springframework.cloud', 'spring-cloud-netflix-core', '1.1.3.RELEASE');
          jhipsterFunc.addGradleDependency('compile', 'com.netflix.feign', 'feign-core', '8.16.2');
          jhipsterFunc.addGradleDependency('compile', 'com.netflix.feign', 'feign-slf4j', '8.16.2');
          jhipsterFunc.addGradleDependency('compile', 'org.springframework.cloud', 'spring-cloud-starter-oauth2', '1.1.0.RELEASE');
        }
      }

      var javaDir = jhipsterVar.javaDir + '/client';
      var sourceClientDir = this.tempDir + '/' + javaDir + '/' + this.apiName;
      var destClientDir = this.currentDir + '/' + javaDir + '/' + this.apiName;

      var sourceModelDir = sourceClientDir + '/model';
      var destModelDir = destClientDir + '/model';

      var sourceApiDir = sourceClientDir + '/api';
      var destApiDir = destClientDir + '/api';

      this.fs.dir

      this.fs.copy(path.normalize(sourceApiDir + '/ApiApiClient.java'), path.normalize(destClientDir + '/' + this.cliName + 'Client.java'));
      this.fs.copy(path.normalize(sourceApiDir + '/ApiApi.java'), path.normalize(destApiDir + '/' + this.cliName + '.java'));
      this.fs.copy(path.normalize(sourceModelDir + '/*.java'), path.normalize(destModelDir));
      shelljs.rm('-rf', this.tempDir);

      // JH 3.7 has this now
      //
      // var mainClassFile = jhipsterVar.javaDir + jhipsterVar.mainClassName +'.java';
      // var newComponentScan = '@ComponentScan( excludeFilters = {\n' +
      //     '    @ComponentScan.Filter(' + jhipsterVar.packageName + '.client.ExcludeFromComponentScan.class)\n' +
      //     '})\n' +
      //     '@org.springframework.cloud.netflix.feign.EnableFeignClients\n';
      // jhipsterFunc.replaceContent(mainClassFile, '@ComponentScan\n', newComponentScan);
      // this.template('src/main/java/package/client/_ExcludeFromComponentScan.java', jhipsterVar.javaDir + '/client/ExcludeFromComponentScan.java', this, {});
    }
  },

  install: function () {
    if (!this.isJHipsterV2 && this.hasFrontend) {
      this.spawnCommand('gulp', ['inject']);
    }
  }

});

function askForRegistryUrl() {
  var registryUrl = this.registryUrl;

  var done = this.async();

  var prompts = [
    {
      type: 'confirm',
      name: 'isMicroservice',
      message: 'Are you utilizing microservices ?',
      default: true
    },
    {
      when: function (response) {
        return response.isMicroservice;
      },
      type: 'input',
      name: 'registryUrl',
      message: 'What is your registry url ?',
      default: 'http://admin:admin@localhost:8761/',
      store: true
    }
  ];

  this.prompt(prompts, function (props) {
    if (props.registryUrl !== this.registryUrl) {
      this.registryUrl = props.registryUrl;
    }
    this.isMicroservice = props.isMicroservice
    done();
  }.bind(this));
}

function askForGatewayName() {
  var gatewayAppName = this.gatewayAppName;
  var gatewayUrl = this.gatewayUrl;

  var done = this.async();
  var prompts = [
    {
      when: function (response) {
        return this.isMicroservice;
      }.bind(this),
      type: 'input',
      name: 'gatewayAppName',
      message: 'What is your gateway app name ?',
      default: 'gateway',
      store: true
    },
    {
      when: function (response) {
        gatewayUrl = this.gatewayUrl = getGatewayUrl(this.log, this.registryUrl, response.gatewayAppName);
        return gatewayUrl == null;
      }.bind(this),
      type: 'input',
      name: 'gatewayUrl',
      message: 'Could not get gateway url from the registry.  Enter your gateway url',
      default: 'http://localhost:8080',
      store: true
    }
  ];

  this.prompt(prompts, function (props) {
    if (props.gatewayAppName !== this.gatewayAppName) {
      this.gatewayAppName = props.gatewayAppName;
    }
    if (typeof props.gatewayUrl !== 'undefined') {
      this.gatewayUrl = props.gatewayUrl;
    }
    done();
  }.bind(this));
}

function askIfUsingRegistry() {
  var availableDocs = this.availableDocs;
  if (this.isMicroservice) {
    availableDocs = this.availableDocs = getAvailableDocs(this.log, this.gatewayUrl);
  }

  var done = this.async();
  var prompts = [
    {
      when: function () {
        return availableDocs.length;
      },
      type: 'confirm',
      name: 'useRegistry',
      message: 'Do you want to use one of these swagger-docs ?',
      default: true
    },
    {
      when: function (response) {
        return response.useRegistry;
      },
      type: 'list',
      name: 'inputSpec',
      message: 'Select the doc for which you want to create a client ?',
      choices: this.availableDocs,
      store: true
    }
  ];

  this.prompt(prompts, function (props) {
    if (props.inputSpec !== this.inputSpec) {
      this.inputSpec = props.inputSpec;
    }
    this.clientName = null
    for (var i in availableDocs) {
      if (availableDocs[i].value == this.inputSpec) {
        this.apiName = this.availableDocs[i].apiName;
        this.clientName = _.capitalize(_.camelize(this.apiName));
        break;
      }
    }

    done();
  }.bind(this));
}

function getGatewayUrl(log, registryUrl, gatewayAppName) {
  var gatewayUrl = null;

  //Check if there is a registry running
  var res = request('GET', registryUrl + 'management/health');
  if (JSON.parse(res.getBody()).status === "UP") {
    log(chalk.yellow('JHipster registry') + ' detected on ' + registryUrl);

    var appsRes = request('GET', registryUrl + 'api/eureka/applications?cacheBuster=' + Math.ceil((new Date).getTime() / 300000) * 300000);

    JSON.parse(appsRes.getBody()).applications.some(function (app) {
      if (gatewayUrl == null && (app.name == gatewayAppName.toUpperCase() || app.name == gatewayAppName)) {
        app.instances.some(function (instance) {
          var gwHealthRes = request('GET', instance.healthCheckUrl);
          // this doesn't work because healthCheckUrl returns 404 and management/health requires auth
          // if (JSON.parse(gwHealthRes.getBody()).status === "UP") {
          log(chalk.yellow('JHipster gateway') + ' found at ' + instance.homePageUrl);
          gatewayUrl = instance.homePageUrl;
          return;
          // }
        })
      }
    })
    return gatewayUrl;
  }
}

function getAvailableDocs(log, gatewayUrl) {
  var swaggerResources = request('GET', gatewayUrl + 'swagger-resources', {
    //This header is needed to use the custom /swagger-resources controller
    // and not the default one that has only the gateway's swagger resource
    headers: {Accept: "application/json, text/javascript;"}
  });

  var availableDocs = [];
  JSON.parse(swaggerResources.getBody()).forEach(function (swaggerResource) {
    availableDocs.push({
      value: gatewayUrl.slice(0, -1) + swaggerResource.location,
      name: swaggerResource.name + ' (' + swaggerResource.location + ')',
      apiName: swaggerResource.name
    });
  });

  log('The following swagger-docs have been found :');
  availableDocs.forEach(function (doc) {
    log('* ' + chalk.green(doc.name) + " : " + doc.value);
  }.bind(this));

  return availableDocs;
}
