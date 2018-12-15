# Node Explorer Server

## Setup

1. Clone the repository from github
    ```
    git clone https://github.com/LogosNetwork/node-explorer-server.git
    ```
2. Pull the submodules from the client
    ```
    git submodule foreach git pull origin master
    ```
3. Install Node.js via NVM
    ```
    wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
    ```
    restart terminal window and then verify installation
    ```
    command -v nvm
    ```
    Install LTS of node
    ```
    nvm install node
    ```
4. Install PM2
    ```
    npm install pm2@latest -g
    ```
5. Install Node Modules for server
    You might need to have npm access to the private SDK's if they are not open source yet!
    ```
    cd /node-explorer-server
    npm install
    ```
6. Install Node Modules for client
    You might need to have npm access to the private SDK's if they are not open source yet!
    ```
    cd /node-explorer-client
    npm install
    ```
7. Install PostgresSQL 
    ```
    sudo apt-get update
    sudo apt-get install postgresql postgresql-contrib
    sudo -i -u postgres
    createuser --interactive
    sudo -u logosnodeexplorer createdb accountusername
    ```
    
8. Install Redis
    [Follow this guide](https://www.digitalocean.com/community/tutorials/how-to-install-and-configure-redis-on-ubuntu-16-04)
    
9. Setup Nginx
    Enabled UFW (make sure to allow OpenSSH)
    ```
    sudo ufw allow OpenSSH
    sudo ufw enable
    ```
    [Next follow this guide to install nginx](https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-16-04)
10. Setup SSL
    [Follow this guide to setup SSL](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-16-04)
11. Configure the server
    Set the config.json inside of the node-explorer-server to
    ```json
    {
        "environment": "production",
        "system": {
            "port": 3000
        },
        "faucetPrivateKey": "PrivateKeyOfTheFaucetAccount",
        "accountID": "AccountIdOfFaucetAccount",
        "accountKey": "PublicKeyOfFaucetAccount",
        "database": {
            "development": {
                "database": "logosnodeexplorer",
                "username": "TheUser",
                "password": "TheUser'sPassword",
                "host": "localhost",
                "dialect": "postgres"
            },
            "production": {
                "database": "logosnodeexplorer",
                "username": "TheUser",
                "password": "TheUser'sPassword",
                "host": "localhost",
                "dialect": "postgres"
            }
        },
        "mqtt": {
            "wsport": 8883,
            "wssport": 8443,
            "port": 1883,
            "securePort": 1883,
            "url": "wss:pla.bs:8443",
            "options": {
                "clientId": "prometheanlabs",
                "username": "prometheanlabs",
                "password": "1234"
            },
            "block": {
                "opts": {
                    "qos": 2,
                    "retain": false
                }
            }
        },
        "keyPath": "/etc/letsencrypt/live/pla.bs/privkey.pem",
        "certPath": "/etc/letsencrypt/live/pla.bs/fullchain.pem",
        "delegates": {
            "0": "100.25.175.142",
            "1": "174.129.135.230",
            "2": "18.208.239.123",
            "3": "18.211.1.90",
            "4": "18.233.175.15",
            "5": "18.233.235.87",
            "6": "3.81.242.200",
            "7": "3.82.164.171",
            "8": "34.227.209.242",
            "9": "34.237.166.184",
            "10": "34.239.238.121",
            "11": "35.170.167.20",
            "12": "50.17.125.174",
            "13": "52.203.151.67",
            "14": "52.23.71.123",
            "15": "52.6.18.99",
            "16": "52.6.230.153",
            "17": "52.86.212.70",
            "18": "54.145.211.218",
            "19": "54.145.253.93",
            "20": "54.147.201.7",
            "21": "54.147.253.43",
            "22": "54.163.88.0",
            "23": "54.166.158.6",
            "24": "54.197.141.197",
            "25": "54.205.169.103",
            "26": "54.236.190.13",
            "27": "54.242.31.23",
            "28": "54.80.152.235",
            "29": "54.84.116.105",
            "30": "54.85.141.93",
            "31": "54.91.99.2"
        }
    }

    ```
    make sure you have ownership of the cert and private key SSL
12. Set NGINX sites-enabled config
    ```
    sudo nano /etc/nginx/sites-enabled/default
    ```
    ```
    upstream nodeexplorer {
            ip_hash;
            server 127.0.0.1:3000;
            keepalive 64;
    }

    server {
            listen 80 default_server;
            listen [::]:80 default_server;

            root /var/www/html;

            index index.html index.htm index.nginx-debian.html;

            server_name pla.bs www.pla.bs;

            location / {
                    proxy_buffering off;
                    proxy_pass http://nodeexplorer;
                    proxy_http_version 1.1;
                    proxy_send_timeout 240s;
                    proxy_set_header Upgrade $http_upgrade;
                    proxy_set_header Connection 'upgrade';
                    proxy_set_header Host $host;
                    proxy_set_header X-Real-IP $remote_addr;
                    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                    proxy_set_header X-Forwarded-Proto $scheme;
                    proxy_set_header X-NginX-Proxy true;
            }

        listen [::]:443 ssl ipv6only=on; # managed by Certbot
        listen 443 ssl; # managed by Certbot
        ssl_certificate /etc/letsencrypt/live/pla.bs/fullchain.pem; # managed by Certbot
        ssl_certificate_key /etc/letsencrypt/live/pla.bs/privkey.pem; # managed by Certbot
        include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
        ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

        # if ($host = www.pla.bs) {
        #    return 301 https://$host$request_uri;
        # } # managed by Certbot

        # if ($host = pla.bs) {
        #    return 301 https://$host$request_uri;
        # } # managed by Certbot
    }
    ```
13. Enabled UFW for WS and WSS ports
    ```
    sudo ufw allow 8883
    sudo ufw allow 8443
    ```
14. Turn on the server!
    ```
    pm2 start server.js
    ```
