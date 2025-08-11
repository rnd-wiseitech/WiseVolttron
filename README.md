# WpPlatform

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 12.0.0.

## Installation
```
[Default]
mariadb 10.4 이상
node 14.19.1 이상
tedious 14.6.1 (wp-server package,fixed)
python=3.7.6
conda=4.8.2

[플랫폼 필수 인프라 버전 정보]
Docker : 26.1.2
CRI-Dockerd : 0.3.13
Kubernetes : 1.29.5
Calico : 3.27.3
Kube-State-Metrics : 2.12.0

[플랫폼 어플리케이션 버전 정보]
Prometheus : 2.52.0
Prometheus/Node-exporter : 1.8.1
GraFana : 11.0.0

▶ 설치 파일 구글 Dirve 주소 :
https://drive.google.com/drive/folders/10gKHFGOvKa4pnmLP-hVXmcp2poU9H9RU?usp=drive_link

▶ 사용방법 :
image.tgz 다운 후 
wp-platform.v1\projects\wp-server\setup\kubernetes 에 압축 푼 후 설치 스크립트 진행 

```

## 배포 (2024-06-12 기준) ##
    tensorflow 포함 (cnn, rnn, lstm, dqn 사용)
      pip install -r requirement_platform_linux_cpu.txt
    tensorflow 미포함
      pip install -r requirement_platform_linux_gpu.txt
  
## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
