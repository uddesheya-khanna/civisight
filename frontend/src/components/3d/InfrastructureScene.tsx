/**
 * InfrastructureScene — legacy shim.
 * This file previously contained the static scene used by the old Landing page.
 * The active scene is now CiviSightScene (scroll-driven).
 * This shim is kept so that any future reference to InfrastructureScene compiles.
 */
export { CiviSightScene as InfrastructureScene } from './CiviSightScene';
