# kindle-sync

Synchronize a folder with Kindle (upload + deletion of remote files).

## Installation

First install `npm install -g clouddrive` and then:

```
clouddrive config auth.email my-email@example.com
clouddrive init
```

Next run `npm install -g kindle_push` and then:

```
kindle_push
```

Lastly, you can install kindle-sync:

```
npm install -g git+https://github.com/tcr/kindle-sync
```

* Run `kindle-sync` in a folder with all your Kindle files.
* It will prompt you before making any changes!
* For the initial sync, run `kindle-sync --download`.

## License

MIT

With special thanks to [kindle_push](https://www.npmjs.com/package/kindle_push) by @yiting007
