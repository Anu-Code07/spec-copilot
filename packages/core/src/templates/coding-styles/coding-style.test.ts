import { describe, it, expect } from 'vitest';
import { codingStyleMd, structureMd, techStackMd } from '../steering.js';

describe('coding style templates', () => {
  it('flutter coding style is substantial (not a stub)', () => {
    const md = codingStyleMd('flutter');
    expect(md.length).toBeGreaterThan(2000);
    expect(md).toContain('Clean Architecture');
    expect(md).toContain('BLoC');
    expect(md).toContain('UseCase');
    expect(md).toContain('Equatable');
  });

  it('nextjs coding style covers server/client and DTOs', () => {
    const md = codingStyleMd('nextjs');
    expect(md.length).toBeGreaterThan(1500);
    expect(md).toContain('Server Component');
    expect(md).toContain('DTO');
  });

  it('react-native coding style covers FlatList and status unions', () => {
    const md = codingStyleMd('react-native');
    expect(md.length).toBeGreaterThan(1500);
    expect(md).toContain('FlatList');
    expect(md).toContain('loading');
  });

  it('structure templates mention correct layers', () => {
    expect(structureMd('flutter')).toContain('usecases');
    expect(structureMd('nextjs')).toContain('features');
    expect(structureMd('react-native')).toContain('screens');
  });

  it('tech stack prefers BLoC for flutter', () => {
    expect(techStackMd('flutter')).toContain('flutter_bloc');
  });
});
