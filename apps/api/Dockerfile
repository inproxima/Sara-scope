FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 8000
CMD ["/app/start.sh"]

