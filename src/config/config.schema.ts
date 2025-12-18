import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string().required(),
  JWT_SECRET: Joi.string().required().min(12),
  DEEPSEEK_API_KEY: Joi.string().required(),
  DEEPSEEK_MODEL: Joi.string().default('deepseek-chat'),
  MAX_TOKENS: Joi.number().default(4000),
});
