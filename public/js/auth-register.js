/**
 * @file Auth Register JavaScript (Refactored)
 * @description Provides a reusable class to handle password confirmation validation on a form.
 */

/**
 * Manages password confirmation validation for a registration form.
 */
export class RegistrationFormValidator {
  /**
   * @param {HTMLFormElement} form - The form element containing the password fields.
   */
  constructor(form) {
      if (!form) {
          throw new Error('A form element must be provided.');
      }
      this.form = form;
      this.passwordField = this.form.querySelector('#password');
      this.confirmPasswordField = this.form.querySelector('#confirmPassword');
  }

  /**
   * Initializes the validation by attaching an event listener.
   * Does nothing if the required password fields are not found.
   */
  init() {
      if (this.passwordField && this.confirmPasswordField) {
          this.confirmPasswordField.addEventListener('input', this.validate.bind(this));
      }
  }

  /**
   * Performs the validation check and sets the custom validity message
   * on the confirm password field.
   */
  validate() {
      const password = this.passwordField.value;
      const confirmPassword = this.confirmPasswordField.value;

      if (password !== confirmPassword) {
          this.confirmPasswordField.setCustomValidity('Passwords do not match');
      } else {
          this.confirmPasswordField.setCustomValidity('');
      }
  }
}
