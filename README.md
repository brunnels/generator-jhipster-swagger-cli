# generator-jhipster-swagger-cli
[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]
> JHipster module, JHipster module to generate swagger client code from a swagger definition

# Introduction

This is a [JHipster](http://jhipster.github.io/) module, that is meant to be used in a JHipster application.
This module generates code in your JHipster app from a swagger definition. It can generate both front-end AngularJS and back-end [Netflix Feign](https://github.com/Netflix/feign) clients.

# Prerequisites

As this is a [JHipster](http://jhipster.github.io/) module, we expect you have JHipster and its related tools already installed:

- [Installing JHipster](https://jhipster.github.io/installation.html)

# Installation

To install this module:

```bash
npm install -g generator-jhipster-swagger-cli
```

To update this module:
```bash
npm update -g generator-jhipster-swagger-cli
```

# Usage
Run:
```bash
yo jhipster-swagger-cli
```
then answer the questions.
You have the possibility to store a client configuration for future regeneration (eg. if there is an API update). If you do so, next time you launch the module, you will have the choice to generate a new client or to reuse one or several stored configurations.

## Use the generated back-end Feign code
### ApiClient configuration
In application.yml:
```yaml
petstore:
    url: http://petstore.swagger.io/v2  #url from spec by default
    security:
        passwordOauth:
            access-token-uri: http://petstore.swagger.io/oauth2/token
            client-id: myClientId
            client-secret: myClientSecret
            username: myUsername
            password: myPassword
            scopes:
            - read
            - write
```

### Calling API methods
For instance if you generated the [petstore](http://petstore.swagger.io) API, you can call the addPet method like this
```java
@Inject
private PetApiClient petApiClient;
...
Pet myPet = new Pet();
petApiClient.addPet(myPet);
```

## Use the generated front-end AngularJS code
The code is generated as a service inside a module. Then you can use it directly but if the remote API is not your JHipster API you will probably need to modify the auth interceptor so that it puts different Authorization/CSRF headers for these requests (see #5)


# License

Apache-2.0 © [Christophe Bornet]

[npm-image]: https://img.shields.io/npm/v/generator-jhipster-swagger-cli.svg
[npm-url]: https://npmjs.org/package/generator-jhipster-swagger-cli
[travis-image]: https://travis-ci.org/cbornet/generator-jhipster-swagger-cli.svg?branch=master
[travis-url]: https://travis-ci.org/cbornet/generator-jhipster-swagger-cli
[daviddm-image]: https://david-dm.org/cbornet/generator-jhipster-swagger-cli.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/cbornet/generator-jhipster-module
