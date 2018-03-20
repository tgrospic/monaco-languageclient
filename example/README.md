# Rholang language server example

### Rholang Web (example from this repo)

The web app is a static site (index.html, main.ts, client.ts, bundle...). For example this could be Jekyll site hosted on GitHub, easy to modify and share and to support multiple server versions.

```

-----------------           ---------------            ----------------
|    Docker     |   stdio   |    Nodejs   |  sockets   |   Browser    |
|  rholang-cli  |<--------->| Lang Server |<---------->|  Lang CLient |
-----------------           ---------------            ----------------

```
### Editor version

```
                       ...........................
-----------------      :    ---------------      :     ----------------
|    Docker     |   stdio   |    Nodejs   |  sockets   |    Editor    |
|  rholang-cli  |<--------->| Lang Server |<---------->|  Lang CLient |
-----------------      :    ---------------      :     ----------------
        ^              :  Docker - rholang-lsp   :
        |              :.........................:
        |                           ^                 ------------------
        |                           |                 |    Rholang     |
        ----------------------------------------------| Editor Plugin  | 
                                run docker            ------------------
                        (or detect local install)
```

# Run

```
npm i --prefix ../ && npm i

npm start
```

Language server is started on http://localhost:3000/.

Sample command `Run contract` sends the text to Docker `rholang-cli` and the result is displayed in the browser console.
