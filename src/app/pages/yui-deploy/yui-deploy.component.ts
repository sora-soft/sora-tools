import { Component } from '@angular/core';
import {UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {DEP_DOCKER_COMPONSE_YML, DEP_MYSQL_SCRIPT_CREATE_DATABASE_SH, DEP_MYSQL_SCRIPT_CREATE_DATABASE_SQL, DEP_TRAEFIK_CONFIG_YML, DEP_TRAEFIK_DYNAMIC_HTTP_YML, ICompileData, README_MD, YUI_CONFIG_CONFIG_COMMAND_YML, YUI_CONFIG_CONFIG_YML, YUI_CREATE_DATABASE_SH, YUI_CREATE_ROOT_SH, YUI_DOCKER_COMPOSE_YML, YUI_ENV, YUI_MIGRATE_SH} from './files';
import * as JSZip from 'jszip';
import {FileService} from './file.service';
import {ValidatorFn} from '@angular/forms';
import {AbstractControl} from '@angular/forms';


function etcdHostValidator(control: AbstractControl) {
  const addresses = control.value.split(',');
  const regex = /^https?:\/\/\S+:\d{1,5}$/;
  for (let i = 0; i < addresses.length; i++) {
    if (!regex.test(addresses[i].trim())) {
      return {
        etcdHostInvalid: true
      };
    }
  }
  return null;
}

function redisHostValidator(control: AbstractControl) {
  const regex = /^redis:\/\/\S+:\d{1,5}$/;
  if (regex.test(control.value)) {
    return {
      redisHostInvalid: true
    };
  }
  return null;
}

function databaseHostValidator(control: AbstractControl) {
  const regex = /^(\d{1,3}\.){3}\d{1,3}$|^([\w-]+\.)+[\w-]+$/;
  if (regex.test(control.value)) {
    return {
      databaseHostInvalid: true
    };
  }
  return null;
}

function domainValidator(control: AbstractControl) {
  const regex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
  if (regex.test(control.value)) {
    return {
      domainInvalid: true
    };
  }
  return null;
}

function ipValidator(control: AbstractControl) {
  const regex = /^((25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(25[0-5]|2[0-4]\d|[01]?\d{1,2})$/;
  if (regex.test(control.value)) {
  return {
      ipInvalid: true
    };
  }
  return null;
}

const FILES: {
  path: string,
  content: (data: ICompileData) => string,
  condition: (data: ICompileData) => boolean,
}[] = [
  {
    path: 'yui/create-database.sh',
    content: YUI_CREATE_DATABASE_SH,
    condition: (data: ICompileData) => data.databaseType === 'built-in',
  },
  {
    path: 'yui/.env',
    content: YUI_ENV,
    condition: () => true
  },
  {
    path: 'yui/create-root.sh',
    content: YUI_CREATE_ROOT_SH,
    condition: () => true
  },
  {
    path: 'yui/migrate.sh',
    content: YUI_MIGRATE_SH,
    condition: () => true
  },
  {
    path: 'yui/docker-compose.yml',
    content: YUI_DOCKER_COMPOSE_YML,
    condition: () => true
  },
  {
    path: 'dependence/docker-compose.yml',
    content: DEP_DOCKER_COMPONSE_YML,
    condition: (data: ICompileData) => data.hasDependence,
  },
  {
    path: 'dependence/mysql-script/create-database.sql',
    content: DEP_MYSQL_SCRIPT_CREATE_DATABASE_SQL,
    condition: (data: ICompileData) => data.hasDependence
  },
  {
    path: 'dependence/mysql-script/create-database.sh',
    content: DEP_MYSQL_SCRIPT_CREATE_DATABASE_SH,
    condition: (data: ICompileData) => data.databaseType === 'built-in',
  },
  {
    path: 'dependence/traefik/config.yml',
    content: DEP_TRAEFIK_CONFIG_YML,
    condition: (data: ICompileData) => data.traefikType === 'built-in',
  },
  {
    path: 'dependence/traefik/dynamic/http.yml',
    content: DEP_TRAEFIK_DYNAMIC_HTTP_YML,
    condition: (data: ICompileData) => data.traefikType === 'built-in',
  },
  {
    path: 'yui/config/config-command.yml',
    content: YUI_CONFIG_CONFIG_COMMAND_YML,
    condition: () => true,
  },
  {
    path: 'yui/config/config.yml',
    content: YUI_CONFIG_CONFIG_YML,
    condition: () => true,
  },
  {
    path: 'yui/log/.keep',
    content: () => '',
    condition: () => true,
  },
  {
    path: 'yui/run/.keep',
    content: () => '',
    condition: () => true,
  },
  {
    path: 'dependence/mysql/.keep',
    content: () => '',
    condition: (data: ICompileData) => data.databaseType === 'built-in',
  }
];

@Component({
  selector: 'app-yui-deploy',
  templateUrl: './yui-deploy.component.html',
  styleUrls: ['./yui-deploy.component.scss']
})
export class YuiDeployComponent {
  etcdOptions = {
    useExtraEtcd: false,
  };
  validateForm!: UntypedFormGroup;

  index = 0;
  onIndexChange(index: number): void {
    this.index = index;
  }

  compiledData: ICompileData | undefined;

  get markdown() {
    if (this.compiledData)
      return README_MD(this.compiledData);
    return ''
  }

  constructor(
    private fb: UntypedFormBuilder,
    private file: FileService,
  ) {}

  validateFormValueNotWhen(key: string, value: unknown, validators: ValidatorFn[]) {
    return (control: AbstractControl) => {
      if (this.validateForm?.value[key] !== value) {
        for (const validate of validators) {
          const result = validate(control);
          if (result)
            return result;
        }
      }
      return null;
    }
  }

  validateFormValueWhen(key: string, value: unknown, validators: ValidatorFn[]) {
    return (control: AbstractControl) => {
      if (this.validateForm?.value[key] === value) {
        for (const validate of validators) {
          const result = validate(control);
          if (result)
            return result;
        }
      }
      return null;
    }
  }

  ngOnInit(): void {
    this.validateForm = this.fb.group({
      etcdType: ['built-in'],
      etcdHost: ['', [this.validateFormValueNotWhen('etcdType', 'built-in', [Validators.required, etcdHostValidator])]],
      targetEtcdType: ['built-in'],
      targetEtcdHost: ['', [this.validateFormValueNotWhen('targetEtcdType', 'built-in', [Validators.required, etcdHostValidator])]],
      targetScope: ['', [Validators.required]],
      redisType: ['built-in'],
      redisHost: ['', [this.validateFormValueNotWhen('redisType', 'built-in', [Validators.required])]],
      redisDB: ['', [this.validateFormValueNotWhen('redisType', 'built-in', [Validators.required, Validators.min(0)])]],
      databaseType: ['built-in'],
      dbType: ['mariadb'],
      dbHost: ['', [this.validateFormValueNotWhen('databaseType', 'built-in', [Validators.required])]],
      dbPort: [null, [this.validateFormValueNotWhen('databaseType', 'built-in', [Validators.required, Validators.min(1), Validators.max(65535)])]],
      dbUsername: ['', [this.validateFormValueNotWhen('databaseType', 'built-in', [Validators.required])]],
      dbPassword: ['', [this.validateFormValueNotWhen('databaseType', 'built-in', [Validators.required])]],
      dbName: ['', [this.validateFormValueNotWhen('databaseType', 'built-in', [Validators.required])]],
      traefikType: ['built-in'],
      webExposePort: [null, [this.validateFormValueNotWhen('traefikType', 'built-in', [Validators.required, Validators.min(1), Validators.max(65535)])]],
      serverExposePort: [null, [this.validateFormValueWhen('traefikType', 'none', [Validators.required, Validators.min(1), Validators.max(65535)])]],
      serverExposeHost: ['', [this.validateFormValueNotWhen('traefikType', 'built-in', [Validators.required])]],
      webExposeHost: ['', [this.validateFormValueNotWhen('traefikType', 'built-in', [Validators.required])]],
      host: ['', [Validators.required]],
      portRange: ['', [Validators.required]],
      aliKeyId: ['', [Validators.required]],
      aliSecret: ['', [Validators.required]],
      aliAccountName: ['', [Validators.required]],
    });
  }

  async generateZip() {
    if (this.validateForm.invalid) {
      Object.entries(this.validateForm.controls).forEach(([key, control]) => {
        if (control.invalid) {
          console.log(key);
          console.log(control.errors);
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    const data: ICompileData = {...this.validateForm.value};
    data.hasDependence = false;
    if (data.etcdType === 'built-in') {
      data.etcdHost = 'http://etcd:2379';
      data.hasDependence = true;
    }
    if (data.targetEtcdType === 'built-in') {
      data.targetEtcdHost = data.etcdHost;
    }
    if (data.redisType === 'built-in') {
      data.redisHost = 'redis://redis:6379';
      data.redisDB = 1;
      data.hasDependence = true;
    }
    if (data.databaseType === 'built-in') {
      data.dbType = 'mariadb';
      data.dbHost = 'mariadb';
      data.dbPort = 3306;
      data.dbUsername = 'root';
      data.dbPassword = 'root';
      data.dbName = 'yui';
      data.hasDependence = true;
    }
    if (data.traefikType === 'built-in') {
      data.serverExposeHost = 'yui-backend';
      data.serverExposePort = 0;
      data.webExposeHost = 'yui-frontend';
      data.webExposePort = 80;
      data.hasDependence = true;
    }
    data.portRangeArray = data.portRange.split('-').map((num) => parseInt(num)) as [number, number];
    data.etcdHostArray = data.etcdHost.split(',');
    data.targetEtcdHostArray = data.targetEtcdHost.split(',');

    this.compiledData = data;
    const zip = new JSZip();
    for (const file of FILES) {
      if (file.condition(data)) {
        zip.file(file.path, file.content(data));
      }
    }
    const content = await zip.generateAsync({type:"blob"})

    this.file.downloadFile(content, 'yui.zip');
    // zip.file()
  }
}
