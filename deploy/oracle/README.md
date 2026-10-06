# News Aggregator - Oracle Cloud Deployment

## Prerequisites

- Oracle Cloud account with Always Free tier (Ampere A1 VM: 2 OCPU, 12 GB RAM)
- Basic knowledge of SSH and Linux command line
- Optional: Domain name (for HTTPS)

## Step 1: Create Oracle Cloud VM

1. Log in to [Oracle Cloud Console](https://cloud.oracle.com)
2. Navigate to **Compute** → **Instances** → **Create Instance**
3. Configure:
   - **Name:** `news-aggregator`
   - **Image:** Ubuntu 22.04 (or 24.04) - **Ampere A1** (ARM)
   - **Shape:** VM.Standard.A1.Flex
     - **OCPU:** 2
     - **Memory (GB):** 12
   - **Boot volume:** 200 GB (Always Free)
   - **SSH keys:** Upload your public key
4. Click **Create** and wait for the instance to start

## Step 2: Configure Security List (Open Ports)

In Oracle Cloud Console:

1. Go to **Networking** → **Virtual Cloud Networks**
2. Click on your VCN
3. Click on your **Security List** (under Subnets)
4. Add **Ingress Rules**:
   - **Source CIDR:** `0.0.0.0/0`
   - **Destination Port:** `22` (SSH)
   - **Description:** SSH access

   - **Source CIDR:** `0.0.0.0/0`
   - **Destination Port:** `80` (HTTP)
   - **Description:** HTTP access

   - **Source CIDR:** `0.0.0.0/0`
   - **Destination Port:** `443` (HTTPS)
   - **Description:** HTTPS access

5. Click **Add Ingress Rules** for each

## Step 3: SSH into VM

```bash
ssh -i ~/.ssh/your-key ubuntu@<VM_PUBLIC_IP>
```

Replace `<VM_PUBLIC_IP>` with your VM's public IP address.

## Step 4: Deploy the Application

### Option A: Using Git (Recommended)

```bash
# Install Git if not already installed
sudo apt update
sudo apt install -y git

# Clone your repository
git clone https://github.com/your-username/news-aggregator.git
cd news-aggregator

# Run the deployment script
sudo bash deploy/oracle/provision.sh
```

### Option B: Using SCP (Upload Files)

From your local machine:

```bash
# Upload the project to the VM
scp -i ~/.ssh/your-key -r /path/to/news-aggregator ubuntu@<VM_PUBLIC_IP>:~/
```

Then SSH into the VM and run:

```bash
cd ~/news-aggregator
sudo bash deploy/oracle/provision.sh
```

## Step 5: Configure Environment Variables

The deployment script will create a `.env` file from the example. Edit it:

```bash
cd /opt/news-aggregator
nano .env
```

Set your Guardian API key:

```
GUARDIAN_API_KEY=your-actual-api-key-here
```

Get a free API key from: https://open.theguardian.com/access/

Save and exit (Ctrl+O, Enter, Ctrl+X).

## Step 6: Restart Application

```bash
cd /opt/news-aggregator
sudo docker compose down
sudo docker compose up -d
```

## Step 7: Verify Deployment

```bash
# Check if containers are running
sudo docker compose ps

# View logs
sudo docker compose logs -f app

# Test the application
curl http://localhost:3000
```

Access your app at: `http://<VM_PUBLIC_IP>`

## Step 8: Optional - Configure HTTPS with Domain

If you have a domain name:

1. Point DNS A record to your VM IP
2. Edit Caddyfile:

```bash
cd /opt/news-aggregator
nano Caddyfile
```

Uncomment the HTTPS section and replace `example.com` with your domain:

```caddy
yourdomain.com {
    reverse_proxy app:3000
}
```

3. Restart Caddy:

```bash
sudo docker compose restart caddy
```

Caddy will automatically provision HTTPS certificates via Let's Encrypt.

## Maintenance Commands

### View Application Status

```bash
cd /opt/news-aggregator
sudo docker compose ps
```

### View Logs

```bash
# All logs
sudo docker compose logs -f

# App only
sudo docker compose logs -f app

# Caddy only
sudo docker compose logs -f caddy
```

### Update Application

```bash
cd /opt/news-aggregator

# Pull latest changes (if using Git)
sudo git pull origin main

# Rebuild and restart
sudo docker compose up -d --build
```

### Backup Database

```bash
cd /opt/news-aggregator
sudo docker compose exec app cp /app/data/news.db /app/data/news.db.backup
sudo cp /var/lib/docker/volumes/news-aggregator_news-data/_data/news.db ./news-backup-$(date +%Y%m%d).db
```

### Restore Database

```bash
cd /opt/news-aggregator
sudo docker compose down
sudo cp ./news-backup-20240101.db /var/lib/docker/volumes/news-aggregator_news-data/_data/news.db
sudo docker compose up -d
```

### Stop Application

```bash
cd /opt/news-aggregator
sudo docker compose down
```

### Start Application

```bash
cd /opt/news-aggregator
sudo docker compose up -d
```

### Remove Application (with data)

```bash
cd /opt/news-aggregator
sudo docker compose down -v
```

## Troubleshooting

### Container won't start

```bash
# Check logs
sudo docker compose logs app

# Check if port is already in use
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :80
```

### Database errors

```bash
# Check if data directory exists
sudo docker compose exec app ls -la /app/data

# Check permissions
sudo docker compose exec app id
```

### Out of memory

Check memory usage:

```bash
free -h
sudo docker stats
```

The app is configured with 1 GB memory limit. If you need more, edit `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 2G
```

### Rebuild from scratch

```bash
cd /opt/news-aggregator
sudo docker compose down -v
sudo docker compose build --no-cache
sudo docker compose up -d
```

## Performance Optimization

### Enable Swap (Recommended for 12 GB RAM)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Monitor Resources

```bash
# Install htop
sudo apt install -y htop
htop
```

## Cost

This deployment uses **Oracle Cloud Always Free Tier**:
- **VM:** 2 OCPU, 12 GB RAM (Ampere A1) - Free forever
- **Boot Volume:** 200 GB - Free forever
- **Outbound Data:** 10 TB/month - Free

**Total monthly cost: $0**

## Support

For issues specific to Oracle Cloud:
- [Oracle Cloud Documentation](https://docs.oracle.com/en-us/iaas/Content/Compute/home.htm)

For Next.js deployment issues:
- [Next.js Deployment Docs](https://nextjs.org/docs/app/building-your-application/deploying)
