#!/usr/bin/env node

'use strict'

/*
   {
    "serviceType"   : "gmail",
    "serviceEmail"  : "your service email",
    "servicePwd"    : "your service email's password",
    "senderEmail"   : "your sender email",
    "receiverEmail" : "your kindle email"
   }

*/

var fs = require('fs');
var nodemailer = require('nodemailer');
var inquirer = require("inquirer");

var filePath = process.env['HOME'] + '/.kindle.json';

var pushService = {
  transporter: {},
  options: {},
  attachmentFiles: [],

  configJson: {
    serviceType: 'gmail', //for now support gmail only
    serviceEmail: '',
    servicePwd: '',
    senderEmail: '',
    receiverEmail: ''
  },

  load: function(files, next) {
    var data = fs.readFileSync(filePath, 'utf8');
    this.configJson = JSON.parse(data);

    files.forEach(function(f) {
      this.book(f);
    }, this);
    if (!this.validation()) {
      console.log('Error pushing to kindle, exist');
      return;
    }
    this.mailConfig();
    this.send(next);
  },

  book: function(file) {
    console.log('Adding book ' + file + '...');
    this.attachmentFiles.push({
      'path': file
    });
  },

  mailConfig: function() {
    this.transporter = nodemailer.createTransport({
      service: this.configJson.serviceType,
      auth: {
        user: this.configJson.serviceEmail,
        pass: this.configJson.servicePwd
      }
    });

    this.options = {
      from: this.configJson.senderEmail,
      to: this.configJson.receiverEmail,
      subject: 'Convert Kindle Book',
      text: 'Here is a new Kindle book.',
      html: '<p>Here is a new Kindle book.</p>',
      attachments: this.attachmentFiles
    };
  },

  send: function(next) {
    console.log('Pushing to kindle...');
    this.transporter.sendMail(this.options, function(error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log('Done: ' + info.response);
        next && next();
      }
    });
  },

  validation: function() {
    var emailPattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    var valid = emailPattern.test(this.configJson.serviceEmail);
    if (!valid) {
      console.log('[Wrong format] please check your service email: ' + this.configJson.serviceEmail);
      return false;
    }
    valid = emailPattern.test(this.configJson.senderEmail);
    if (!valid) {
      console.log('[Wrong format] please check your sender email: ' + this.configJson.senderEmail);
      return false;
    }
    valid = emailPattern.test(this.configJson.receiverEmail);
    if (!valid) {
      console.log('[Wrong format]: please check your receiver email: ' + this.configJson.receiverEmail);
      return false;
    }
    if (!this.attachmentFiles.length) {
      console.log('[No attachment found]:');
      return false;
    }
    for (var i = 0, len = this.attachmentFiles.length; i < len; i++) {
      try {
        fs.statSync(this.attachmentFiles[i]['path']);
      } catch (err) {
        console.log('[File not found]: ' + this.attachmentFiles[i]['path']);
        if (err.code == 'ENOENT') return false;
      }
    }
    return valid;
  }
};

function launch (next) {
  fs.readFile(filePath, function(err, data) {
    if (err) {
      if (err.code === 'ENOENT') {
        console.log('Config file not found, creating one...');
        var params = [{
          type: 'input',
          name: 'serviceEmail',
          message: 'Service email(gmail):'
        }, {
          type: 'password',
          name: 'servicePwd',
          message: 'Service password:'
        }, {
          type: 'input',
          name: 'senderEmail',
          message: 'Sender email:'
        }, {
          type: 'input',
          name: 'receiverEmail',
          message: 'Kindle email'
        }]
        inquirer.prompt(params, function(ans) {
          for (var k in ans) {
            pushService.configJson[k] = ans[k];
          }
          fs.writeFile(filePath, JSON.stringify(pushService.configJson, null, 4), function(err) {
            if (err) {
              console.log(err);
            } else {
              console.log('Config file saved to ' + filePath + ', ready for use, exist');
            }
          });
        });
      }
    } else {
      next(pushService);
    }
  });
}

exports.launch = launch;
