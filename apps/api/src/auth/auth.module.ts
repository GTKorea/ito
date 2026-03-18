import { Module, Logger, type Provider } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

const logger = new Logger('AuthModule');

const optionalProviders: Provider[] = [];

if (process.env.GOOGLE_CLIENT_ID) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GoogleStrategy } = require('./strategies/google.strategy');
  optionalProviders.push(GoogleStrategy);
} else {
  logger.warn('GOOGLE_CLIENT_ID not set — Google OAuth disabled');
}

if (process.env.GITHUB_CLIENT_ID) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GitHubStrategy } = require('./strategies/github.strategy');
  optionalProviders.push(GitHubStrategy);
} else {
  logger.warn('GITHUB_CLIENT_ID not set — GitHub OAuth disabled');
}

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'dev-secret'),
        signOptions: { expiresIn: config.get('JWT_EXPIRATION', '15m') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ...optionalProviders],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
