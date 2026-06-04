/**
 * @fileoverview Comprehensive test suite for LoginModal component.
 *
 * @description
 * Tests all functionality including modal visibility, email/password form,
 * OAuth authentication, form validation, and event emissions.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import LoginModal from './LoginModal.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'

/**
 * Type definition for Login Modal VM instance.
 */
interface LoginModalVM {
  email: string
  password: string
  rememberMe: boolean
  isLoading: boolean
  handleLogin: () => void
  handleOAuthLogin: (provider: string) => void
}

/**
 * Mock composables.
 */
vi.mock('../../composables/useNotifications', () => ({
  useNotifications: () => ({
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

describe('LoginModal.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  /**
   * Cleanup after each test.
   */
  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  /**
   * Helper to mount component.
   */
  const createWrapper = (props = {}, options = {}) => {
    return mount(LoginModal, {
      props: {
        visible: true,
        ...props,
      },
      global: {
        components: {
          BaseIcon,
          BaseButton,
        },
        stubs: {
          BaseIcon: true,
          BaseButton: true,
          ...options.stubs,
        },
      },
    })
  }

  describe('Rendering', () => {
    it('should mount and render without errors', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should not render when visible is false', () => {
      wrapper = createWrapper({ visible: false })
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('should render modal overlay when visible is true', () => {
      wrapper = createWrapper({ visible: true })
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    })

    it('should render modal title "Login"', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-title').text()).toBe('Login')
    })

    it('should render close button with aria-label', () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.exists()).toBe(true)
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should render email input field', () => {
      wrapper = createWrapper()
      const emailInput = wrapper.find('input[type="email"]')
      expect(emailInput.exists()).toBe(true)
      expect(emailInput.attributes('id')).toBe('email')
      expect(emailInput.attributes('placeholder')).toBe('your@email.com')
    })

    it('should render password input field', () => {
      wrapper = createWrapper()
      const passwordInput = wrapper.find('input[type="password"]')
      expect(passwordInput.exists()).toBe(true)
      expect(passwordInput.attributes('id')).toBe('password')
      expect(passwordInput.attributes('placeholder')).toBe('••••••••')
    })

    it('should render remember me checkbox', () => {
      wrapper = createWrapper()
      const checkbox = wrapper.find('input[type="checkbox"]')
      expect(checkbox.exists()).toBe(true)
    })

    it('should render remember me label', () => {
      wrapper = createWrapper()
      const label = wrapper.find('.checkbox-label span')
      expect(label.text()).toBe('Remember me')
    })

    it('should render divider with "or" text', () => {
      wrapper = createWrapper()
      const divider = wrapper.find('.divider span')
      expect(divider.text()).toBe('or')
    })

    it('should render GitHub OAuth button', () => {
      wrapper = createWrapper()
      const githubButton = wrapper.find('.oauth-button.github')
      expect(githubButton.exists()).toBe(true)
      expect(githubButton.text()).toContain('Continue with GitHub')
    })

    it('should render Google OAuth button', () => {
      wrapper = createWrapper()
      const googleButton = wrapper.find('.oauth-button.google')
      expect(googleButton.exists()).toBe(true)
      expect(googleButton.text()).toContain('Continue with Google')
    })

    it('should render forgot password button', () => {
      wrapper = createWrapper()
      const forgotButton = wrapper.find('.forgot-password')
      expect(forgotButton.exists()).toBe(true)
      expect(forgotButton.text()).toBe('Forgot password?')
    })

    it('should render login button', () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      const buttons = wrapper.findAll('button')
      const loginButton = buttons.find((btn) => btn.text().includes('Login'))
      expect(loginButton).toBeTruthy()
    })
  })

  describe('Form Validation', () => {
    it('should have isValid as false by default', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM
      expect(vm.isValid).toBe(false)
    })

    it('should have isValid as false when email is empty', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.email = ''
      vm.password = 'password123'
      await nextTick()

      expect(vm.isValid).toBe(false)
    })

    it('should have isValid as false when email does not contain @', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.email = 'invalidemail'
      vm.password = 'password123'
      await nextTick()

      expect(vm.isValid).toBe(false)
    })

    it('should have isValid as false when password is too short', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.email = 'user@example.com'
      vm.password = '12345' // Less than 6 characters
      await nextTick()

      expect(vm.isValid).toBe(false)
    })

    it('should have isValid as false when password is exactly 5 characters', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.email = 'user@example.com'
      vm.password = '12345'
      await nextTick()

      expect(vm.isValid).toBe(false)
    })

    it('should have isValid as true when email contains @ and password is 6+ characters', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.email = 'user@example.com'
      vm.password = '123456'
      await nextTick()

      expect(vm.isValid).toBe(true)
    })

    it('should have isValid as true when password is exactly 6 characters', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.email = 'test@test.com'
      vm.password = 'abcdef'
      await nextTick()

      expect(vm.isValid).toBe(true)
    })

    it('should update isValid when email input changes', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM
      const emailInput = wrapper.find('input[type="email"]')

      expect(vm.isValid).toBe(false)

      await emailInput.setValue('user@example.com')
      vm.password = '123456'
      await nextTick()

      expect(vm.isValid).toBe(true)
    })

    it('should update isValid when password input changes', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM
      const passwordInput = wrapper.find('input[type="password"]')

      vm.email = 'user@example.com'
      await nextTick()

      expect(vm.isValid).toBe(false)

      await passwordInput.setValue('password123')
      await nextTick()

      expect(vm.isValid).toBe(true)
    })
  })

  describe('Form Inputs', () => {
    it('should bind email input with v-model', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM
      const emailInput = wrapper.find('input[type="email"]')

      expect(vm.email).toBe('')

      await emailInput.setValue('test@example.com')
      expect(vm.email).toBe('test@example.com')
    })

    it('should bind password input with v-model', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM
      const passwordInput = wrapper.find('input[type="password"]')

      expect(vm.password).toBe('')

      await passwordInput.setValue('mypassword')
      expect(vm.password).toBe('mypassword')
    })

    it('should bind remember me checkbox with v-model', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM
      const checkbox = wrapper.find('input[type="checkbox"]')

      expect(vm.rememberMe).toBe(false)

      await checkbox.setValue(true)
      expect(vm.rememberMe).toBe(true)

      await checkbox.setValue(false)
      expect(vm.rememberMe).toBe(false)
    })
  })

  describe('Login Functionality', () => {
    it('should not emit login when form is invalid', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.email = 'invalid'
      vm.password = '123'

      vm.handleLogin()
      await nextTick()

      expect(wrapper.emitted('login')).toBeFalsy()
    })

    it('should emit login event when form is valid', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.email = 'user@example.com'
      vm.password = '123456'

      vm.handleLogin()
      await nextTick()

      expect(wrapper.emitted('login')).toBeTruthy()
    })

    it('should emit login event with correct data structure', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.email = 'test@test.com'
      vm.password = 'password123'
      vm.rememberMe = true

      vm.handleLogin()
      await nextTick()

      expect(wrapper.emitted('login')![0]).toEqual([
        {
          method: 'email',
          email: 'test@test.com',
          rememberMe: true,
        },
      ])
    })

    it('should emit login with rememberMe: false by default', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.email = 'user@example.com'
      vm.password = '123456'
      vm.rememberMe = false

      vm.handleLogin()
      await nextTick()

      expect(wrapper.emitted('login')![0]).toEqual([
        {
          method: 'email',
          email: 'user@example.com',
          rememberMe: false,
        },
      ])
    })

    it('should emit close event after successful login', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.email = 'user@example.com'
      vm.password = '123456'

      vm.handleLogin()
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should call handleLogin when login button is clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.email = 'user@example.com'
      vm.password = '123456'
      await nextTick()

      const buttons = wrapper.findAll('button')
      const loginButton = buttons.find((btn) => btn.text().includes('Login'))
      await loginButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('login')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('OAuth Functionality', () => {
    it('should emit login event when GitHub button is clicked', async () => {
      wrapper = createWrapper()
      const githubButton = wrapper.find('.oauth-button.github')

      await githubButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('login')).toBeTruthy()
    })

    it('should emit login with correct OAuth data for GitHub', async () => {
      wrapper = createWrapper()
      const githubButton = wrapper.find('.oauth-button.github')

      await githubButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('login')![0]).toEqual([
        {
          method: 'oauth',
          provider: 'github',
        },
      ])
    })

    it('should emit login event when Google button is clicked', async () => {
      wrapper = createWrapper()
      const googleButton = wrapper.find('.oauth-button.google')

      await googleButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('login')).toBeTruthy()
    })

    it('should emit login with correct OAuth data for Google', async () => {
      wrapper = createWrapper()
      const googleButton = wrapper.find('.oauth-button.google')

      await googleButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('login')![0]).toEqual([
        {
          method: 'oauth',
          provider: 'google',
        },
      ])
    })

    it('should emit close event after OAuth login', async () => {
      wrapper = createWrapper()
      const githubButton = wrapper.find('.oauth-button.github')

      await githubButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should call handleOAuth with correct provider', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.handleOAuth('github')
      await nextTick()

      expect(wrapper.emitted('login')![0]).toEqual([
        {
          method: 'oauth',
          provider: 'github',
        },
      ])
    })

    it('should call handleOAuth with google provider', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.handleOAuth('google')
      await nextTick()

      expect(wrapper.emitted('login')![0]).toEqual([
        {
          method: 'oauth',
          provider: 'google',
        },
      ])
    })
  })

  describe('Forgot Password Functionality', () => {
    it('should not emit login when forgot password is clicked', async () => {
      wrapper = createWrapper()
      const forgotButton = wrapper.find('.forgot-password')

      await forgotButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('login')).toBeFalsy()
    })

    it('should call handleForgotPassword when button is clicked', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM
      const consoleLogSpy = vi.spyOn(console, 'log')

      vm.handleForgotPassword()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Login] Forgot password clicked'
      )
    })

    it('should handle forgot password button click', async () => {
      wrapper = createWrapper()
      const forgotButton = wrapper.find('.forgot-password')
      const consoleLogSpy = vi.spyOn(console, 'log')

      await forgotButton.trigger('click')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Login] Forgot password clicked'
      )
    })
  })

  describe('Modal Interactions', () => {
    it('should emit close event when close button is clicked', async () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      await closeButton.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close event when overlay is clicked', async () => {
      wrapper = createWrapper()
      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not emit close when modal container is clicked', async () => {
      wrapper = createWrapper()
      const container = wrapper.find('.modal-container')
      await container.trigger('click')

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should call handleOverlayClick when overlay is clicked', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.handleOverlayClick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Component Lifecycle', () => {
    it('should initialize with empty email', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as LoginModalVM

      expect(vm.email).toBe('')
    })

    it('should initialize with empty password', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as LoginModalVM

      expect(vm.password).toBe('')
    })

    it('should initialize with rememberMe as false', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as LoginModalVM

      expect(vm.rememberMe).toBe(false)
    })

    it('should cleanup properly when unmounted', () => {
      wrapper = createWrapper()
      expect(() => wrapper.unmount()).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria-label on close button', () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should have proper label for email input', () => {
      wrapper = createWrapper()
      const labels = wrapper.findAll('.label')
      expect(labels[0].text()).toBe('Email')
    })

    it('should have proper label for password input', () => {
      wrapper = createWrapper()
      const labels = wrapper.findAll('.label')
      expect(labels[1].text()).toBe('Password')
    })

    it('should have proper id on email input', () => {
      wrapper = createWrapper()
      const emailInput = wrapper.find('input[type="email"]')
      expect(emailInput.attributes('id')).toBe('email')
    })

    it('should have proper id on password input', () => {
      wrapper = createWrapper()
      const passwordInput = wrapper.find('input[type="password"]')
      expect(passwordInput.attributes('id')).toBe('password')
    })

    it('should have checkbox wrapped in label', () => {
      wrapper = createWrapper()
      const checkboxLabel = wrapper.find('.checkbox-label')
      expect(checkboxLabel.exists()).toBe(true)
      expect(checkboxLabel.find('input[type="checkbox"]').exists()).toBe(true)
    })
  })

  describe('Integration Tests', () => {
    it('should complete full workflow: enter credentials and login', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      // Enter credentials
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      const checkbox = wrapper.find('input[type="checkbox"]')

      await emailInput.setValue('user@example.com')
      await passwordInput.setValue('password123')
      await checkbox.setValue(true)

      // Click login
      const buttons = wrapper.findAll('button')
      const loginButton = buttons.find((btn) => btn.text().includes('Login'))
      await loginButton!.trigger('click')
      await nextTick()

      // Verify emissions
      expect(wrapper.emitted('login')).toBeTruthy()
      expect(wrapper.emitted('login')![0]).toEqual([
        {
          method: 'email',
          email: 'user@example.com',
          rememberMe: true,
        },
      ])
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should complete OAuth workflow with GitHub', async () => {
      wrapper = createWrapper()
      await nextTick()

      const githubButton = wrapper.find('.oauth-button.github')
      await githubButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('login')).toBeTruthy()
      expect(wrapper.emitted('login')![0]).toEqual([
        {
          method: 'oauth',
          provider: 'github',
        },
      ])
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should complete OAuth workflow with Google', async () => {
      wrapper = createWrapper()
      await nextTick()

      const googleButton = wrapper.find('.oauth-button.google')
      await googleButton.trigger('click')
      await nextTick()

      expect(wrapper.emitted('login')).toBeTruthy()
      expect(wrapper.emitted('login')![0]).toEqual([
        {
          method: 'oauth',
          provider: 'google',
        },
      ])
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should allow cancel without login', async () => {
      wrapper = createWrapper()
      await nextTick()

      const closeButton = wrapper.find('.close-button')
      await closeButton.trigger('click')

      expect(wrapper.emitted('login')).toBeFalsy()
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid form changes', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')

      await emailInput.setValue('user1@test.com')
      await emailInput.setValue('user2@test.com')
      await emailInput.setValue('user3@test.com')

      await passwordInput.setValue('pass1')
      await passwordInput.setValue('pass123')
      await passwordInput.setValue('password123')

      expect(vm.email).toBe('user3@test.com')
      expect(vm.password).toBe('password123')
      expect(vm.isValid).toBe(true)
    })

    it('should handle checkbox rapid toggles', async () => {
      wrapper = createWrapper()
      const checkbox = wrapper.find('input[type="checkbox"]')

      await checkbox.setValue(true)
      await checkbox.setValue(false)
      await checkbox.setValue(true)
      await checkbox.setValue(false)

      expect((checkbox.element as HTMLInputElement).checked).toBe(false)
    })

    it('should handle multiple login attempts', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.email = 'user@example.com'
      vm.password = '123456'

      vm.handleLogin()
      vm.handleLogin()
      vm.handleLogin()

      expect(wrapper.emitted('login')).toHaveLength(3)
      expect(wrapper.emitted('close')).toHaveLength(3)
    })

    it('should handle email with multiple @ symbols', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.email = 'user@@example.com'
      vm.password = '123456'
      await nextTick()

      expect(vm.isValid).toBe(true) // Still has @, so valid
    })

    it('should handle very long password', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.email = 'user@example.com'
      vm.password = 'a'.repeat(100)
      await nextTick()

      expect(vm.isValid).toBe(true)
    })

    it('should handle empty form submission attempt', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.handleLogin()
      await nextTick()

      expect(wrapper.emitted('login')).toBeFalsy()
    })

    it('should handle password with exactly 6 characters', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.email = 'user@example.com'
      vm.password = '123456'
      await nextTick()

      expect(vm.isValid).toBe(true)
    })

    it('should handle special characters in email', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as LoginModalVM

      vm.email = 'user+test@example.co.uk'
      vm.password = 'password123'
      await nextTick()

      expect(vm.isValid).toBe(true)
    })
  })
})
