#!/usr/bin/env node

var fs = require('fs');
var md5File = require('md5-file');
var spawnSync = require('child_process').spawnSync;
var push = require('./push');
var uuid = require('uuid');
var yesno = require('yesno');

function upload (files) {
  push.launch(function (service) {
    service.load(files, function () {
      console.log('uploaded!');
      process.exit(0);
    });
  });
}

function getDocs () {
  var obj = spawnSync('clouddrive', ['ls', 'My Send-to-Kindle Docs/'])
  if (obj.status != 0) {
    console.log('clouddrive ls');
    console.log(obj.stderr.toString());
    process.exit(obj.status);
  }

  console.log('Fetching books...');

  return obj.stdout.toString().replace(/\s+$/, '').split(/\n/)
  .map(function (line) {
    var data = line.split(/\s+/, 7);
    var filename = line.replace(/(\S+\s+){7}/, '')

    var obj = spawnSync('clouddrive', ['metadata', '-i', data[0]]);
    if (obj.status != 0) {
      console.error('Error in fetching metadata:', obj.stderr);
      return null;
    }
    var metadata = JSON.parse(obj.stdout);

    return metadata;
  })
  .filter(function (metadata) {
    return metadata
  })
}

spawnSync('clouddrive', ['sync'], {
  stdio: 'inherit',
});

var mode = process.argv[2];
if (mode == '--download') {
  var docs = getDocs();
  docs.forEach(function (doc) {
    if (doc.status == 'TRASH') {
      return;
    }

    try {
      var md5 = md5File(doc.name);
      if (md5 == doc.contentProperties.md5) {
        return;
      }
    } catch (e) {
    }
    try {
      fs.unlinkSync(doc.name);
    } catch (e) {
    }
    spawnSync('clouddrive', ['download', '-i', doc.id], {
      stdio: 'inherit',
    });
  });
} else if (mode == null) {
  var docs = getDocs();

  // First overwrite conflicting docs (uploaded MD5 may be diff)
  var toDownload = [];
  docs.forEach(function (doc) {
    if (doc.status == 'TRASH') {
      return;
    }

    try {
      var md5 = md5File(doc.name);
      if (md5 == doc.contentProperties.md5) {
        return;
      }
    } catch (e) {
      return;
    }
    toDownload.push([doc.name, doc.id]);
  });

  // Now delete non-local docs.
  var toRename = [];
  docs.forEach(function (doc) {
    if (doc.status == 'TRASH') {
      return;
    }

    if (!fs.existsSync(doc.name)) {
      var newname = uuid.v4();
      toRename.push([doc.name, doc.id, newname]);
    }
  })

  // Now upload new docs.
  var toUpload = fs.readdirSync('./').filter(function (localDoc) {
    return docs.filter(function (doc) {
      return doc.name == localDoc
    }).length == 0
  });

  console.log('To be downloaded:', toDownload);
  console.log('To delete:', toRename);
  console.log('To upload:', toUpload);

  yesno.ask('Are you sure you want to continue?', true, function (ok) {
    if (ok) {
      toDownload.forEach(function (tuple) {
        var name = tuple[0], id = tuple[1];

        try {
          fs.unlinkSync(name);
        } catch (e) {
        }

        spawnSync('clouddrive', ['download', '-i', id], {
          stdio: 'inherit',
        });
      })

      toRename.forEach(function (tuple) {
        var name = tuple[0], id = tuple[1], newname = tuple[2];
        spawnSync('clouddrive', ['rename', '-i', id, newname], {
          stdio: 'inherit',
        });
        spawnSync('clouddrive', ['rm', '-i', id], {
          stdio: 'inherit',
        });
      });

      if (toUpload.length > 0) {
        upload(toUpload);
      } else {
        console.log('done');
        process.exit(0);
      }
    } else {
      process.exit(1);
    }
  });
} else {
  console.error('kindle-sync [--download]');
  process.exit(1);
}
