export interface ICompileData {
  etcdType: string;
  etcdHost: string;
  etcdHostArray: string[];
  targetEtcdType: string;
  targetEtcdHost: string;
  targetEtcdHostArray: string[];
  targetScope: string;
  redisType: string;
  redisHost: string;
  redisDB: number;
  databaseType: string;
  traefikType: string;
  webExposePort: number;
  serverExposePort: number;
  dbType: string;
  dbHost: string;
  dbPort: number;
  dbUsername: string;
  dbPassword: string;
  dbName: string;
  host: string;
  serverExposeHost: string,
  webExposeHost: string,
  portRange: string;
  portRangeArray: [number, number];
  aliKeyId: string;
  aliSecret: string;
  aliAccountName: string;
  hasDependence: boolean;
}

const getEtcdHostWithoutProtocol = (host: string) => {
  if (host.startsWith('http://'))
    return host.slice('http://'.length);
  if (host.startsWith('https://'))
    return host.slice('https://'.length);
  return host;
}

export const YUI_CREATE_DATABASE_SH = (data: ICompileData) =>
`
${data.databaseType == 'built-in'?'docker exec -it mariadb /bin/sh /var/lib/mysql-script/create-database.sh':''}
`

export const YUI_ENV = () =>
`
BACKEND_VERSION=1.0.1
FRONTEND_VERSION=1.0.0
`

export const YUI_CREATE_ROOT_SH = (data: ICompileData) =>
`
export $(xargs <.env)
docker run -it --rm ${data.hasDependence ? '--network=yui_network' : ''} -v \${PWD}/config:/etc/app -v \${PWD}/log:/var/log/app -v \${PWD}/run:/run/app xyyaya/yui-maintain-backend:\${BACKEND_VERSION} node ./bin/cli.js command --config /etc/app/config-command.yml -w /run/app -n auth-command create-root root root root@example.com
`

export const YUI_MIGRATE_SH = (data: ICompileData) =>
`
export $(xargs <.env)
docker run -it --rm ${data.hasDependence ? '--network=yui_network' : ''} -v \${PWD}/config:/etc/app -v \${PWD}/log:/var/log/app -v \${PWD}/run:/run/app xyyaya/yui-maintain-backend:\${BACKEND_VERSION} node ./bin/cli.js command --config /etc/app/config-command.yml -w /run/app -n database-migrate-command migrate business-database
`

export const YUI_DOCKER_COMPOSE_YML = (data: ICompileData) =>
`
version: '3'

services:
  yui-backend:
    container_name: yui-backend
    image: xyyaya/yui-maintain-backend:\${BACKEND_VERSION}
    environment:
      - NODE_OPTIONS=--max_old_space_size=4096
    volumes:
      - \${PWD}/run:/run/app
      - \${PWD}/log:/var/log/app
      - \${PWD}/config:/etc/app
    ${data.hasDependence ?
    `
    networks:
      - yui_network
    `: ''
    }
    ${data.traefikType == 'none' ?
    `
    ports:
      - ${data.serverExposePort}:${data.serverExposePort}
    `:''}
    ${data.traefikType == 'customized' ?
    `
    ports:
      - ${data.portRangeArray[0]}-${data.portRangeArray[1]}:${data.portRangeArray[0]}-${data.portRangeArray[1]}
    `: ''}

  yui-frontend:
    container_name: yui-frontend
    image: xyyaya/yui-maintain-frontend:\${FRONTEND_VERSION}
    ${data.traefikType == 'built-in' ?
    `
    networks:
      - yui_network
    ` :
    `
    ports:
      - ${data.webExposePort}:80
    `}
${data.hasDependence?
`
networks:
  yui_network:
    external: true
`:''
}
`

export const DEP_DOCKER_COMPONSE_YML = (data: ICompileData) =>
`
version: '3'

services:
  ${data.etcdType === 'built-in'?
  `
  etcd:
    container_name: etcd
    image: 'bitnami/etcd:latest'
    environment:
      - ALLOW_NONE_AUTHENTICATION=yes
      - ETCD_ADVERTISE_CLIENT_URLS=http://0.0.0.0:2379
      - ETCD_LISTEN_CLIENT_URLS=http://0.0.0.0:2379
      - ETCDCTL_API=3
    networks:
      - yui_network
  `:''}
  ${data.redisType === 'built-in'?
  `
  redis:
    container_name: redis
    image: "redis:alpine"
    command: redis-server
    networks:
      - yui_network
  `:''}

  ${data.databaseType === 'built-in'?
  `
  mariadb:
    image: mariadb:10.5
    container_name: mariadb
    volumes:
      - \${PWD}/mysql:/var/lib/mysql
      - \${PWD}/mysql-script:/var/lib/mysql-script
    environment:
      - MYSQL_ROOT_PASSWORD=root
    networks:
      - yui_network
  `:''}

  ${data.traefikType === 'built-in'?
  `
  traefik:
    container_name: traefik
    image: traefik
    command:
      - "--configFile=/etc/traefik/config.yml"
    volumes:
      - "\${PWD}/traefik:/etc/traefik"
      - "/var/run/docker.sock:/var/run/docker.sock"
    ports:
      - '80:80'
    networks:
      - yui_network
  `:''}

networks:
  yui_network:
    name: yui_network

`

export const DEP_MYSQL_SCRIPT_CREATE_DATABASE_SQL = (data: ICompileData) =>
`
create database if not exists ${data.dbName};
`

export const DEP_MYSQL_SCRIPT_CREATE_DATABASE_SH = (data: ICompileData) =>
`
mysql -u root -proot < /var/lib/mysql-script/create-database.sql
`

export const DEP_TRAEFIK_CONFIG_YML = (data: ICompileData) =>
`
entrypoints:
  web:
    address: ":80"

providers:
  providersThrottleDuration: 1s
  etcd:
    endpoints: [${data.etcdHostArray.map(host => `"${getEtcdHostWithoutProtocol(host)}"`).join(',')}]
    rootKey: "traefik"
  file:
    directory: "/etc/traefik/dynamic"
`

export const DEP_TRAEFIK_DYNAMIC_HTTP_YML = (data: ICompileData) =>
`
http:
  routers:
    yui:ws-api:
      rule: 'Host(\`${data.host}\`) && PathPrefix(\`/ws\`)'
      service: 'yui-maintain-backend:http-gateway:websocket@etcd'
      middlewares:
        - gzip-compress
    yui:frontend:
      rule: 'Host(\`${data.host}\`)'
      service: 'nginx:yui-maintain-frontend'
      middlewares:
        - gzip-compress
  services:
    nginx:yui-maintain-frontend:
      loadBalancer:
        servers:
          - url: "http://${data.webExposeHost}:${data.webExposePort}"
  middlewares:
    gzip-compress:
      compress: {}
`

export const YUI_CONFIG_CONFIG_COMMAND_YML = (data: ICompileData) =>
`
debug: false
discovery:
  etcdComponentName: 'etcd'
  scope: yui

logger:
  file:
    fileFormat: '[/var/log/app/server-]YYYY-MM-DD[.log]'

node:
  alias: yui-command
  api:
    portRange:
      - ${data.portRangeArray[0]}
      - ${data.portRangeArray[1]}
    host: 127.0.0.1

components:
  business-redis:
    url: ${data.redisHost}
    database: ${data.redisDB}
  business-database:
    database:
      type: ${data.dbType}
      host: ${data.dbHost}
      port: ${data.dbPort}
      username*: ${data.dbUsername}
      password*: ${data.dbPassword}
      database: ${data.dbName}
  etcd:
    etcd:
      hosts:
        ${data.etcdHostArray.map(host => `- ${host}`).join('\n')}
    ttl: 10
    prefix: yui

workers:
  database-migrate-command:
    components:
        - business-database
  auth-command: {}
`

export const YUI_CONFIG_CONFIG_YML = (data: ICompileData) =>
`
debug: false
discovery:
  etcdComponentName: 'etcd'
  scope: yui

logger:
  file:
    fileFormat: '[/var/log/app/server-]YYYY-MM-DD[.log]'

node:
  alias: yui-main
  api:
    portRange:
      - ${data.portRangeArray[0]}
      - ${data.portRangeArray[1]}
    host: 127.0.0.1

services:
  http-gateway:
    websocketListener:
      ${data.serverExposePort?
      `
      port: ${data.serverExposePort}
      `:
      `
      portRange:
        - ${data.portRangeArray[0]}
        - ${data.portRangeArray[1]}
      `}
      exposeHost: ${data.serverExposeHost}
      host: 0.0.0.0
      entryPath: '/ws'
    serverListener:
      portRange:
        - ${data.portRangeArray[0]}
        - ${data.portRangeArray[1]}
      host: 127.0.0.1
    ${data.traefikType !== 'none'?
    `
    traefik:
      prefix: traefik
    `:''}

  restful:
    tcpListener:
      portRange:
        - ${data.portRangeArray[0]}
        - ${data.portRangeArray[1]}
      host: 127.0.0.1

  auth:
    tcpListener:
      portRange:
        - ${data.portRangeArray[0]}
        - ${data.portRangeArray[1]}
      host: 127.0.0.1

  monitor:
    tcpListener:
      portRange:
        - ${data.portRangeArray[0]}
        - ${data.portRangeArray[1]}
      host: 127.0.0.1
    targetScope: ${data.targetScope}

components:
  business-redis:
    url: ${data.redisHost}
    database: ${data.redisDB}
  business-database:
    database:
      type: ${data.dbType}
      host: ${data.dbHost}
      port: ${data.dbPort}
      username*: ${data.dbUsername}
      password*: ${data.dbPassword}
      database: ${data.dbName}
  etcd:
    etcd:
      hosts:
        ${data.etcdHostArray.map(host => `- ${host}`).join('\n')}
    ttl: 10
    prefix: yui
  target-etcd:
    etcd:
      hosts:
        ${data.targetEtcdHostArray.map(host => `- ${host}`).join('\n')}
    ttl: 10
    prefix: ${data.targetScope}
  ali-cloud:
    accessKeyId*: ${data.aliKeyId}
    accessKeySecret*: ${data.aliSecret}
    pop:
      accountName: ${data.aliAccountName}

workers:
  monitor:
    target:
      etcdComponentName: 'target-etcd'
      scope: ${data.targetScope}

`

export const README_MD = (data: ICompileData) =>
`
将下载的yui.zip解压到安装目录，本文假设安装目录为 \`\`\`/data\`\`\`
${data.hasDependence?
`
\`\`\`

\`\`\`
`:''}
`
