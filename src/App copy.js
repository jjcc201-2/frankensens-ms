import React, { Component } from 'react';
import { HashRouter as Router, Route } from 'react-router-dom';
import { Container } from 'reactstrap';
import { UserAgentApplication } from 'msal'; // Authenticating to Azure Active Directory and retrieving access tokens
import NavBar from './NavBar';
import ErrorMessage from './ErrorMessage';
import Welcome from './Welcome';
import config from './Config';
import { getUserDetails } from './GraphService';
import 'bootstrap/dist/css/bootstrap.css';
import Calendar from './Calendar';

class App extends Component {
	/*
	Code initializes the UserAgentApplication class with your application ID and 
	checks for the presence of a user. If there is a user, it sets isAuthenticated to true. 
	*/
	constructor(props) {
		super(props);

		console.log(JSON.stringify(props));

		this.userAgentApplication = new UserAgentApplication({
			auth: {
				clientId: config.appId,
				redirectUri: config.redirectUri
			},
			cache: {
				cacheLocation: 'localStorage',
				storeAuthStateInCookie: true
			}
		});

		this.userAgentApplication.handleRedirectCallback((error, response) => {
			// handle redirect response or error
			try {
				this.getUserProfile();
			} catch (error) {
				console.log(error);
			}
		});

		// Is there a user signed in
		var user = this.userAgentApplication.getAccount();

		this.state = {
			isAuthenticated: user !== null,
			user: {},
			error: null
		};

		// If there is a user signed in, get there account
		if (user) {
			// Enhance user object with data from Graph
			this.getUserProfile();
		}
	}

	render() {
		let error = null;
		if (this.state.error) {
			error = (
				<ErrorMessage
					message={this.state.error.message}
					debug={this.state.error.debug}
				/>
			);
		}

		return (
			<Router>
				<div>
					<NavBar
						isAuthenticated={this.state.isAuthenticated}
						authButtonMethod={
							this.state.isAuthenticated
								? this.logout.bind(this)
								: this.login.bind(this)
						}
						user={this.state.user}
					/>
					<button
						onClick={() => {
							fetch(
								'https://jsonplaceholder.typicode.com/todos/1'
							).then(res => res.json());
						}}
					>
						Click me bitch
					</button>
					<Container>
						{error}
						<Route
							exact
							path='/'
							render={props => (
								<Welcome
									{...props}
									isAuthenticated={this.state.isAuthenticated}
									user={this.state.user}
									authButtonMethod={this.login.bind(this)}
								/>
							)}
						/>
						<Route
							exact
							path='/calendar'
							render={props => (
								<Calendar
									{...props}
									showError={this.setErrorMessage.bind(this)}
								/>
							)}
						/>
					</Container>
				</div>
			</Router>
		);
	}

	setErrorMessage(message, debug) {
		this.setState({
			error: { message: message, debug: debug }
		});
	}

	async login() {
		try {
			await this.userAgentApplication.loginPopup({
				scopes: config.scopes,
				prompt: 'select_account'
			});
		} catch (err) {
			console.log(err);
			var error = {};

			if (typeof err === 'string') {
				var errParts = err.split('|');
				error =
					errParts.length > 1
						? { message: errParts[1], debug: errParts[0] }
						: { message: err };
			} else {
				error = {
					message: err.message,
					debug: JSON.stringify(err)
				};
			}

			this.setState({
				isAuthenticated: false,
				user: {},
				error
			});
		}
	}

	logout() {
		this.userAgentApplication.logout();
	}

	async getUserProfile() {
		try {
			// Get the access token silently
			// If the cache contains a non-expired token, this function
			// will just return the cached token. Otherwise, it will
			// make a request to the Azure OAuth endpoint to get a token

			var accessToken = await this.userAgentApplication.acquireTokenSilent(
				{
					scopes: config.scopes
				}
			);

			if (accessToken) {
				// Get the user's profile from Graph
				var user = await getUserDetails(accessToken);
				this.setState({
					isAuthenticated: true,
					user: {
						displayName: user.displayName,
						email: user.mail || user.userPrincipalName
					},
					error: null
				});
			}
		} catch (err) {
			var error = {};
			if (typeof err === 'string') {
				var errParts = err.split('|');
				error =
					errParts.length > 1
						? { message: errParts[1], debug: errParts[0] }
						: { message: err };
			} else {
				error = {
					message: err.message,
					debug: JSON.stringify(err)
				};
			}

			this.setState({
				isAuthenticated: false,
				user: {},
				error: error
			});
		}
	}
}

export default App;
