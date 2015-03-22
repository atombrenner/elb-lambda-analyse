rm lambda.zip
zip -r lambda.zip lambda.js node_modules/async node_modules/underscore

# Optionally upload your lambda, did not work for me, uploaded zip manually
# aws lambda upload-function \
#   --region eu-west-1 \
#   --function-name analyse-elb-logs \
#   --function-zip lambda.zip \
#   --role arn:aws:iam::514996828637:role/lambda_exec \
#   --mode event \
#   --handler lambda.handler \
#   --runtime nodejs \
#   --timeout 30 \
#   --memory-size 128
