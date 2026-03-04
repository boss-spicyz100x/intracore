job "intracore" {
  datacenters = ["dc1"]
  type        = "service"

  meta {
    run_uuid = "${uuidv4()}"
  }

  group "app" {
    count = 1

    network {
      port "http" { static = 25050 }
    }

    task "intracore-server" {
      driver = "podman"

      config {
        image = "ghcr.io/boss-spicyz100x/intracore:latest"
        auth {
          username = "boss-spicyz100x"
          password = "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"
        }
        ports = ["http"]
      }

      template {
        data = <<EOH
PORT=25050
DATABASE_URL="postgres://{{ with nomadVar "secrets" }}{{ .database_user }}{{ end }}:{{ with nomadVar "secrets" }}{{ .database_password }}{{ end }}@{{ with nomadVar "secrets" }}{{ .database_host }}{{ end }}:{{ with nomadVar "secrets" }}{{ .database_port }}{{ end }}/intracore"
EOH
        destination = "local/env.vars"
        env         = true
      }

      service {
        name     = "intracore"
        port     = "http"
        provider = "nomad"
        check {
          name     = "intracore-http"
          type     = "http"
          path     = "/health"
          interval = "10s"
          timeout  = "2s"
        }
      }

      resources {
        cpu    = 2000
        memory = 4096
      }

      restart {
        attempts = 3
        interval = "30m"
        delay    = "15s"
        mode     = "fail"
      }

      logs {
        max_files     = 10
        max_file_size = 10
      }
    }
  }
}
