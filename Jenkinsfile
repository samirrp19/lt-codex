pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    // Change these 2
    DOCKERHUB_USER = "samirrp19"   // e.g. samrash
    APP_NAME       = "lt-codex"

    IMAGE_TAG      = "${env.BUILD_NUMBER}"
    IMAGE          = "${DOCKERHUB_USER}/${APP_NAME}:${IMAGE_TAG}"
    IMAGE_LATEST   = "${DOCKERHUB_USER}/${APP_NAME}:latest"
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Docker Build') {
      steps {
        sh '''
          set -e
          docker version
          docker build --no-cache -t "$IMAGE" -t "$IMAGE_LATEST" . 
          docker images | head -n 30
        '''
      }
    }

    stage('DockerHub Login') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          sh '''
            set -e
            echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
          '''
        }
      }
    }

    stage('Push to DockerHub') {
      steps {
        sh '''
          set -e
          docker push "$IMAGE"
          docker push "$IMAGE_LATEST"
        '''
      }
    }

    stage('Smoke Test (optional)') {
      steps {
        sh '''
          set -e
          CID=$(docker run -d -p 8088:80 "$IMAGE_LATEST")
          echo "Container: $CID"
          sleep 4
          docker ps --filter "id=$CID"
          docker logs --tail=80 "$CID" || true
          docker rm -f "$CID" || true
        '''
      }
    }
  }

  post {
    always {
      sh 'docker logout || true'
      cleanWs()
    }
  }
}
