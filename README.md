# Local CI/CD & GitOps Pipeline

This repository contains a full-stack DevOps workflow including local Git hosting, CI automation, a private container registry, and GitOps-driven deployment.


---

## 🏗 System Architecture & Port Mapping

To ensure a collision-free environment on a local machine, all services have been assigned unique ports.

| Service            | Host Port | Internal Port | Description                          |
|:-------------------|:----------|:--------------|:-------------------------------------|
| **Jenkins** | `8080`    | `8080`        | CI Automation & Webhook handling     |
| **ArgoCD** | `8081`    | `443`         | GitOps Controller (Port-forwarded)   |
| **Node.js App** | `4000`    | `80`          | Target Application (Port-forwarded)  |
| **Gogs Web UI** | `3001`    | `3000`        | Git Source Control                   |
| **Zot Registry** | `5000`    | `5000`        | Container Image Storage              |
| **PostgreSQL** | `5432`    | `5432`        | Database for Gogs                    |
| **Webhook Recv** | `9000`    | `9000`        | Webhook Processing                   |

---

## 🚀 Installation & Setup


# Full stack deployment
```
docker compose up -d
```
# Targeted service rebuild (useful for development)
```
docker compose up -d --no-deps --build gogs jenkins webhook-receiver
```
# Start Minikube
```
minikube start --insecure-registry="host.docker.internal:5000"
```

# Install ArgoCD & Image Updater
```
kubectl create namespace argocd
kubectl apply -n argocd -f [https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml](https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml)
kubectl apply -n argocd -f [https://raw.githubusercontent.com/argoproj-labs/argocd-image-updater/v0.12.2/manifests/install.yaml](https://raw.githubusercontent.com/argoproj-labs/argocd-image-updater/v0.12.2/manifests/install.yaml)
```
# Establish Access
```
kubectl port-forward svc/argocd-server -n argocd 8081:443
```

✅ Workflow Checklist
- Gogs: Connected to PostgreSQL and Webhooks configured for push events.

- Jenkins: SCM configured to Gogs; Webhook triggers verified.

- ArgoCD: Application manifests applied.

- Registry: zot registry.


🔮 Future Improvements (Production Roadmap)
- Secrets Management: Implement HashiCorp Vault or Sealed Secrets instead of local config files.
- ### Infrastructure & Cloud Migration
* **Cloud Migration (AWS/Azure/GCP):** Transition from a local Minikube environment to a managed Kubernetes service like **EKS, AKS, or GKE**.
* **Managed Services:** Replace self-hosted components with managed equivalents for higher availability (e.g., **AWS RDS** for PostgreSQL, **Amazon ECR** for the container registry).
* **Infrastructure as Code (IaC):** Use **Terraform** or **Pulumi** to provision cloud VPCs, subnets, and clusters, ensuring the entire environment is version-controlled and reproducible.
* **Secrets Management:** Transition from environment variables to **HashiCorp Vault** or **AWS Secrets Manager**.
* **Ingress & DNS:** Deploy an NGINX Ingress Controller with **cert-manager** for automated SSL/TLS (HTTPS) and integrate with **Route53** or **Cloudflare** for DNS.
